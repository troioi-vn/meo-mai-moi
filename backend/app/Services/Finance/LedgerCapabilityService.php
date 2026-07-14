<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Models\Ledger;
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
}
