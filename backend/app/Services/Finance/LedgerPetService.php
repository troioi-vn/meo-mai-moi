<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Enums\LedgerPetAssignmentSource;
use App\Exceptions\FinanceException;
use App\Models\Group;
use App\Models\Ledger;
use App\Models\LedgerPetAssignment;
use App\Models\Pet;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class LedgerPetService
{
    public function addManual(Ledger $ledger, Pet $pet, User $actor): void
    {
        if (! $actor->can('view', $pet)) {
            throw new FinanceException(__('finance.errors.pet_forbidden'), 403);
        }
        DB::transaction(function () use ($ledger, $pet, $actor): void {
            $existing = LedgerPetAssignment::query()->where(['ledger_id' => $ledger->id, 'pet_id' => $pet->id, 'source' => LedgerPetAssignmentSource::MANUAL])->whereNull('end_at')->lockForUpdate()->first();
            if ($existing !== null) {
                return;
            }
            LedgerPetAssignment::query()->create(['ledger_id' => $ledger->id, 'pet_id' => $pet->id, 'source' => LedgerPetAssignmentSource::MANUAL, 'added_by_user_id' => $actor->id, 'start_at' => now()]);
        });
    }

    public function removeManual(Ledger $ledger, Pet $pet): void
    {
        DB::transaction(function () use ($ledger, $pet): void {
            $assignment = LedgerPetAssignment::query()->where(['ledger_id' => $ledger->id, 'pet_id' => $pet->id, 'source' => LedgerPetAssignmentSource::MANUAL])->whereNull('end_at')->lockForUpdate()->first();
            if ($assignment === null) {
                throw new FinanceException(__('finance.errors.manual_pet_not_found'), 404);
            }
            $assignment->update(['end_at' => now()]);
        });
    }

    public function synchronize(Ledger $ledger, Group $group, Pet $pet, bool $available): void
    {
        DB::transaction(function () use ($ledger, $group, $pet, $available): void {
            $query = LedgerPetAssignment::query()->where(['ledger_id' => $ledger->id, 'pet_id' => $pet->id, 'source' => LedgerPetAssignmentSource::GROUP_SYNC, 'source_group_id' => $group->id])->whereNull('end_at');
            $assignment = $query->lockForUpdate()->first();
            if ($available && $assignment === null) {
                LedgerPetAssignment::query()->create(['ledger_id' => $ledger->id, 'pet_id' => $pet->id, 'source' => LedgerPetAssignmentSource::GROUP_SYNC, 'source_group_id' => $group->id, 'start_at' => now()]);
            } elseif (! $available && $assignment !== null) {
                $assignment->update(['end_at' => now()]);
            }
        });
    }

    public function isAvailable(Ledger $ledger, int $petId): bool
    {
        return $ledger->activePetAssignments()->where('pet_id', $petId)->exists();
    }
}
