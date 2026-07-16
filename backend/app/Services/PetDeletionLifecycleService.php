<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ResourceInvitationType;
use App\Models\LedgerPetAssignment;
use App\Models\Pet;
use App\Services\Groups\GroupPetService;
use Illuminate\Support\Facades\DB;

class PetDeletionLifecycleService
{
    public function __construct(
        private readonly GroupPetService $groupPets,
        private readonly ResourceInvitationService $resourceInvitations,
    ) {}

    public function handle(Pet $pet): void
    {
        DB::transaction(function () use ($pet): void {
            $this->groupPets->endAllActiveAssignmentsForPet($pet);
            LedgerPetAssignment::query()
                ->where('pet_id', $pet->id)
                ->whereNull('end_at')
                ->lockForUpdate()
                ->get()
                ->each(fn (LedgerPetAssignment $assignment) => $assignment->update(['end_at' => now()]));
            $this->resourceInvitations
                ->handlerFor(ResourceInvitationType::PET)
                ->revokePendingForTarget($pet);
        });
    }
}
