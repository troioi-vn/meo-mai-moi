<?php

declare(strict_types=1);

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Ledger;
use App\Models\LedgerAccount;
use App\Models\LedgerCategory;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LedgerConfigurationController extends Controller
{
    use ApiResponseTrait;

    public function accounts(Request $request, Ledger $ledger): JsonResponse
    {
        if (! $this->user($request)->can('view', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        $accounts = $ledger->accounts()->withSum(['transactions as income_minor' => fn ($q) => $q->where('type', 'income')], 'amount_minor')->withSum(['transactions as expense_minor' => fn ($q) => $q->where('type', 'expense')], 'amount_minor')->orderByRaw('archived_at NULLS FIRST')->orderBy('name')->get();

        $data = [];
        foreach ($accounts as $account) {
            $income = (int) ($account->income_minor ?? 0);
            $expense = (int) ($account->expense_minor ?? 0);
            $data[] = ['id' => $account->id, 'name' => $account->name, 'archived_at' => $account->archived_at, 'income_minor' => $income, 'expense_minor' => $expense, 'net_activity_minor' => $income - $expense];
        }

        return $this->sendSuccess($data);
    }

    public function storeAccount(Request $request, Ledger $ledger): JsonResponse
    {
        if (! $this->user($request)->can('manage', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        $data = $request->validate(['name' => ['required', 'string', 'max:255']]);

        return $this->sendSuccess($ledger->accounts()->create($data + ['created_by_user_id' => $this->user($request)->id]), 201);
    }

    public function updateAccount(Request $request, Ledger $ledger, LedgerAccount $account): JsonResponse
    {
        if (! $this->validAccount($request, $ledger, $account)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        $account->update($request->validate(['name' => ['required', 'string', 'max:255']]) + ['is_starter' => false]);

        return $this->sendSuccess($account);
    }

    public function archiveAccount(Request $request, Ledger $ledger, LedgerAccount $account): JsonResponse
    {
        if (! $this->validAccount($request, $ledger, $account)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        if ($ledger->accounts()->whereNull('archived_at')->whereKeyNot($account->id)->doesntExist()) {
            return $this->sendError(__('finance.errors.last_account'), 422);
        }
        $account->update(['archived_at' => $account->archived_at === null ? now() : null, 'is_starter' => false]);

        return $this->sendSuccess($account);
    }

    public function categories(Request $request, Ledger $ledger): JsonResponse
    {
        if (! $this->user($request)->can('view', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        return $this->sendSuccess($ledger->categories()->orderByRaw('archived_at NULLS FIRST')->orderBy('name')->get());
    }

    public function storeCategory(Request $request, Ledger $ledger): JsonResponse
    {
        if (! $this->user($request)->can('manage', $ledger)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        $data = $request->validate(['name' => ['required', 'string', 'max:255'], 'applies_to' => ['required', 'in:income,expense,both']]);

        return $this->sendSuccess($ledger->categories()->create($data + ['created_by_user_id' => $this->user($request)->id]), 201);
    }

    public function updateCategory(Request $request, Ledger $ledger, LedgerCategory $category): JsonResponse
    {
        if (! $this->validCategory($request, $ledger, $category)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        $category->update($request->validate(['name' => ['sometimes', 'required', 'string', 'max:255'], 'applies_to' => ['sometimes', 'required', 'in:income,expense,both']]) + ['is_starter' => false]);

        return $this->sendSuccess($category);
    }

    public function archiveCategory(Request $request, Ledger $ledger, LedgerCategory $category): JsonResponse
    {
        if (! $this->validCategory($request, $ledger, $category)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        $category->update(['archived_at' => $category->archived_at === null ? now() : null, 'is_starter' => false]);

        return $this->sendSuccess($category);
    }

    private function validAccount(Request $request, Ledger $ledger, LedgerAccount $account): bool
    {
        return $account->ledger_id === $ledger->id && $this->user($request)->can('manage', $ledger);
    }

    private function validCategory(Request $request, Ledger $ledger, LedgerCategory $category): bool
    {
        return $category->ledger_id === $ledger->id && $this->user($request)->can('manage', $ledger);
    }

    private function user(Request $request): User
    { /** @var User $user */ $user = $request->user();

        return $user;
    }
}
