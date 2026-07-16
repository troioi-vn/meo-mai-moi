<?php

declare(strict_types=1);

namespace App\Services\Groups;

use App\Contracts\GroupLedgerSynchronization;
use App\Exceptions\GroupException;
use App\Models\Group;
use App\Models\GroupPet;
use App\Models\Pet;
use App\Models\User;
use App\Services\PetAccessService;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class GroupPetService
{
    public function __construct(
        private readonly GroupCapabilityService $capabilities,
        private readonly PetAccessService $petAccess,
        private readonly GroupLedgerSynchronization $ledgerSync,
    ) {}

    /**
     * @param  list<int>  $petIds
     * @return list<GroupPet>
     */
    public function addPets(Group $group, array $petIds, User $actor): array
    {
        if ($petIds === []) {
            throw new InvalidArgumentException('pet_ids_required');
        }

        $uniquePetIds = array_values(array_unique(array_map('intval', $petIds)));

        return DB::transaction(function () use ($group, $uniquePetIds, $actor): array {
            if (! $this->capabilities->isActiveAdmin($actor, $group)) {
                throw GroupException::notGroupAdmin();
            }

            $pets = Pet::query()->whereIn('id', $uniquePetIds)->get()->keyBy('id');

            if ($pets->count() !== count($uniquePetIds)) {
                throw GroupException::forbidden();
            }

            foreach ($uniquePetIds as $petId) {
                /** @var Pet $pet */
                $pet = $pets->get($petId);

                if (! $this->petAccess->isDirectOwner($actor, $pet)) {
                    throw GroupException::notPetOwner();
                }

                $alreadyAssigned = GroupPet::query()
                    ->where('group_id', $group->id)
                    ->where('pet_id', $pet->id)
                    ->active()
                    ->exists();

                if ($alreadyAssigned) {
                    throw GroupException::petAlreadyAssigned();
                }
            }

            $assignments = [];

            foreach ($uniquePetIds as $petId) {
                /** @var Pet $pet */
                $pet = $pets->get($petId);

                $assignment = GroupPet::query()->create([
                    'group_id' => $group->id,
                    'pet_id' => $pet->id,
                    'added_by_user_id' => $actor->id,
                    'start_at' => now(),
                    'end_at' => null,
                ]);

                $this->ledgerSync->onPetAttached($group, $pet);
                $assignments[] = $assignment;
            }

            return $assignments;
        });
    }

    public function addPet(Group $group, Pet $pet, User $actor): GroupPet
    {
        $assignments = $this->addPets($group, [$pet->id], $actor);

        return $assignments[0];
    }

    public function removePet(Group $group, Pet $pet, User $actor): void
    {
        DB::transaction(function () use ($group, $pet, $actor): void {
            if (! $this->capabilities->isActiveAdmin($actor, $group)) {
                throw GroupException::notGroupAdmin();
            }

            if (! $this->petAccess->isDirectOwner($actor, $pet)) {
                throw GroupException::notPetOwner();
            }

            /** @var GroupPet|null $assignment */
            $assignment = GroupPet::query()
                ->where('group_id', $group->id)
                ->where('pet_id', $pet->id)
                ->active()
                ->lockForUpdate()
                ->first();

            if ($assignment === null) {
                throw GroupException::forbidden();
            }

            $assignment->update(['end_at' => now()]);
            $this->ledgerSync->onPetDetached($group, $pet);
        });
    }

    public function endAllActiveAssignments(Group $group): void
    {
        GroupPet::query()
            ->where('group_id', $group->id)
            ->active()
            ->update(['end_at' => now()]);
    }

    public function endAllActiveAssignmentsForPet(Pet $pet): void
    {
        DB::transaction(function () use ($pet): void {
            $assignments = GroupPet::query()
                ->where('pet_id', $pet->id)
                ->active()
                ->with('group')
                ->lockForUpdate()
                ->get();

            foreach ($assignments as $assignment) {
                $assignment->update(['end_at' => now()]);

                if ($assignment->group !== null) {
                    $this->ledgerSync->onPetDetached($assignment->group, $pet);
                }
            }
        });
    }
}
