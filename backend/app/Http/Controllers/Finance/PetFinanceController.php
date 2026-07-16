<?php

declare(strict_types=1);

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Ledger;
use App\Models\LedgerTransaction;
use App\Models\Pet;
use App\Models\User;
use App\Services\Finance\LedgerTransactionService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PetFinanceController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, Pet $pet, LedgerTransactionService $service): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        if (! $user->can('view', $pet)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        $ledgerIds = Ledger::query()->accessibleBy($user)->select('ledgers.id');
        $page = LedgerTransaction::query()->whereIn('ledger_id', $ledgerIds)
            ->whereHas('petLinks', fn ($query) => $query->where('pet_id', $pet->id))
            ->with(['ledger.currency', 'account', 'category', 'creator', 'petLinks.pet'])
            ->orderByDesc('occurred_on')->orderByDesc('id')->paginate(20);

        return $this->sendSuccess(['items' => collect($page->items())->map(fn (LedgerTransaction $transaction) => $service->serialize($transaction))->values(), 'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()]);
    }
}
