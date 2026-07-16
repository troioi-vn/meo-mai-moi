<?php

declare(strict_types=1);

namespace App\Services\Groups;

use App\Contracts\GroupLedgerSynchronization;
use App\Models\Group;
use App\Models\Pet;

/**
 * Placeholder until Finance/Ledgers exist. Linking and sync remain Ledger-owned.
 */
class NullGroupLedgerSynchronization implements GroupLedgerSynchronization
{
    public function onPetAttached(Group $group, Pet $pet): void
    {
        // no-op
    }

    public function onPetDetached(Group $group, Pet $pet): void
    {
        // no-op
    }

    public function onGroupDeleted(Group $group): void
    {
        // no-op
    }
}
