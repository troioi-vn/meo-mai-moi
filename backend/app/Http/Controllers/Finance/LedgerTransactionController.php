<?php

declare(strict_types=1);

namespace App\Http\Controllers\Finance;

use App\Exceptions\FinanceException;
use App\Http\Controllers\Controller;
use App\Models\Ledger;
use App\Models\LedgerTransaction;
use App\Models\LedgerTransactionHealthLink;
use App\Models\User;
use App\Services\Finance\LedgerTransactionService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

class LedgerTransactionController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request, Ledger $ledger, LedgerTransactionService $service): JsonResponse
    {
        if (! $this->user($request)->can('view', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        $filters = $request->validate(['date_from' => ['nullable', 'date'], 'date_to' => ['nullable', 'date'], 'type' => ['nullable', 'in:income,expense'], 'account_id' => ['nullable', 'integer'], 'category_id' => ['nullable', 'integer'], 'pet_id' => ['nullable', 'integer'], 'creator_id' => ['nullable', 'integer'], 'search' => ['nullable', 'string', 'max:255'], 'per_page' => ['nullable', 'integer', 'min:1', 'max:100']]);
        $page = $service->paginate($ledger, $filters);

        return $this->sendSuccess(['items' => collect($page->items())->map(fn ($t) => $service->serialize($t))->values(), 'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()]);
    }

    public function store(Request $request, Ledger $ledger, LedgerTransactionService $service): JsonResponse
    {
        if (! $this->user($request)->can('manage', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        try {
            return $this->sendSuccess($service->serialize($service->create($ledger, $this->user($request), $this->validated($request))), 201);
        } catch (FinanceException $e) {
            return $this->sendError($e->getMessage(), $e->status);
        }
    }

    public function show(Request $request, Ledger $ledger, LedgerTransaction $transaction, LedgerTransactionService $service): JsonResponse
    {
        if ($transaction->ledger_id !== $ledger->id || ! $this->user($request)->can('view', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        return $this->sendSuccess($service->serialize($transaction));
    }

    public function update(Request $request, Ledger $ledger, LedgerTransaction $transaction, LedgerTransactionService $service): JsonResponse
    {
        if (! $this->user($request)->can('manage', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        try {
            return $this->sendSuccess($service->serialize($service->update($ledger, $transaction, $this->user($request), $this->validated($request, true))));
        } catch (FinanceException $e) {
            return $this->sendError($e->getMessage(), $e->status);
        }
    }

    public function destroy(Request $request, Ledger $ledger, LedgerTransaction $transaction): Response|JsonResponse
    {
        if ($transaction->ledger_id !== $ledger->id || ! $this->user($request)->can('manage', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        LedgerTransactionHealthLink::query()->where('ledger_transaction_id', $transaction->id)->delete();
        $transaction->delete();

        return $this->sendNoContent();
    }

    public function storeReceipt(Request $request, Ledger $ledger, LedgerTransaction $transaction): JsonResponse
    {
        if ($transaction->ledger_id !== $ledger->id || ! $this->user($request)->can('manage', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        $request->validate(['receipt' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:10240']]);
        $media = $transaction->addMediaFromRequest('receipt')->withCustomProperties(['uploaded_by_user_id' => $this->user($request)->id])->toMediaCollection('receipt');

        return $this->sendSuccess(['id' => $media->id, 'file_name' => $media->file_name], 201);
    }

    public function deleteReceipt(Request $request, Ledger $ledger, LedgerTransaction $transaction): Response|JsonResponse
    {
        if ($transaction->ledger_id !== $ledger->id || ! $this->user($request)->can('manage', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        $transaction->clearMediaCollection('receipt');

        return $this->sendNoContent();
    }

    public function receipt(Request $request, Ledger $ledger, LedgerTransaction $transaction): BinaryFileResponse|JsonResponse
    {
        if ($transaction->ledger_id !== $ledger->id || ! $this->user($request)->can('view', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        $media = $transaction->getFirstMedia('receipt');
        if ($media === null) {
            return $this->sendError(__('finance.errors.not_found'), 404);
        }

        return response()->download($media->getPath(), $media->file_name, ['Content-Type' => $media->mime_type]);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, bool $partial = false): array
    {
        $presence = $partial ? 'sometimes' : 'required';

        return $request->validate(['account_id' => [$presence, 'integer'], 'category_id' => ['sometimes', 'nullable', 'integer'], 'type' => [$presence, 'in:income,expense'], 'amount' => [$presence, 'string', 'max:64'], 'occurred_on' => [$presence, 'date'], 'description' => ['sometimes', 'nullable', 'string', 'max:2000'], 'pet_ids' => ['sometimes', 'array'], 'pet_ids.*' => ['integer', 'distinct']]);
    }

    private function user(Request $request): User
    { /** @var User $user */ $user = $request->user();

        return $user;
    }
}
