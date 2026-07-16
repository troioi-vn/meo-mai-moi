<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Models\Ledger;
use App\Models\LedgerAccount;
use App\Models\LedgerCategory;
use App\Models\LedgerMembership;
use App\Models\LedgerPetAssignment;
use App\Models\LedgerTransaction;
use App\Models\User;

class LedgerCapabilityService
{
    public function isMember(User $user, Ledger $ledger): bool
    {
        return $ledger->activeMemberships()->where('user_id', $user->id)->exists();
    }

    public function canMutate(User $user, Ledger $ledger): bool
    {
        return ! $ledger->isArchived() && $this->isMember($user, $ledger);
    }

    public function canDeleteUnused(User $user, Ledger $ledger): bool
    {
        if ($ledger->isArchived() || $ledger->created_by_user_id !== $user->id || $ledger->group_id !== null) {
            return false;
        }

        $starterCategoryCount = collect(__('finance.starter.categories'))->flatten()->count();

        return LedgerMembership::query()
            ->where('ledger_id', $ledger->id)
            ->count() === 1
            && LedgerMembership::query()
                ->active()
                ->where('ledger_id', $ledger->id)
                ->where('user_id', $user->id)
                ->exists()
            && ! LedgerPetAssignment::query()->where('ledger_id', $ledger->id)->exists()
            && ! LedgerTransaction::withTrashed()->where('ledger_id', $ledger->id)->exists()
            && LedgerAccount::query()->where('ledger_id', $ledger->id)->count() === 1
            && LedgerAccount::query()
                ->where('ledger_id', $ledger->id)
                ->where('is_starter', true)
                ->exists()
            && LedgerCategory::query()->where('ledger_id', $ledger->id)->count() === $starterCategoryCount
            && LedgerCategory::query()
                ->where('ledger_id', $ledger->id)
                ->where('is_starter', true)
                ->count() === $starterCategoryCount;
    }
}
