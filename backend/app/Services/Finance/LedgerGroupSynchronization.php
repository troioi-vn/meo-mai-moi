<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Contracts\GroupLedgerSynchronization;
use App\Models\Group;
use App\Models\Ledger;
use App\Models\Pet;

class LedgerGroupSynchronization implements GroupLedgerSynchronization
{
    public function __construct(private readonly LedgerPetService $pets) {}

    public function onPetAttached(Group $group, Pet $pet): void
    {
        Ledger::query()->where('group_id', $group->id)->where('sync_group_pets', true)->each(fn (Ledger $ledger) => $this->pets->synchronize($ledger, $group, $pet, true));
    }

    public function onPetDetached(Group $group, Pet $pet): void
    {
        Ledger::query()->where('group_id', $group->id)->where('sync_group_pets', true)->each(fn (Ledger $ledger) => $this->pets->synchronize($ledger, $group, $pet, false));
    }

    public function onGroupDeleted(Group $group): void
    {
        Ledger::query()->where('group_id', $group->id)->each(function (Ledger $ledger) use ($group): void {
            $ledger->activePetAssignments()->where('source_group_id', $group->id)->update(['end_at' => now()]);
            $ledger->update(['group_id' => null, 'sync_group_pets' => false]);
        });
    }
}
