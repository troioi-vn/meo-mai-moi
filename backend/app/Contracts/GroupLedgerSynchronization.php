<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Models\Group;
use App\Models\Pet;

/**
 * Ledger owns synchronization. Groups call this synchronously inside pet assignment transactions.
 * No-op until the Finance/Ledger domain exists.
 */
interface GroupLedgerSynchronization
{
    public function onPetAttached(Group $group, Pet $pet): void;

    public function onPetDetached(Group $group, Pet $pet): void;

    public function onGroupDeleted(Group $group): void;
}
