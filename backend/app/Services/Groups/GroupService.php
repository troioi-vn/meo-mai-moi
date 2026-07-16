<?php

declare(strict_types=1);

namespace App\Services\Groups;

use App\Contracts\GroupLedgerSynchronization;
use App\Enums\GroupRole;
use App\Enums\ResourceInvitationType;
use App\Exceptions\GroupException;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\Pet;
use App\Models\User;
use App\Services\ResourceInvitationService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class GroupService
{
    public function __construct(
        private readonly GroupMembershipService $memberships,
        private readonly GroupPetService $groupPets,
        private readonly GroupCapabilityService $capabilities,
        private readonly ResourceInvitationService $invitations,
        private readonly GroupLedgerSynchronization $ledgerSync,
    ) {}

    /**
     * @param  list<int>|null  $petIds
     */
    public function create(User $creator, string $name, ?array $petIds = null): Group
    {
        return DB::transaction(function () use ($creator, $name, $petIds): Group {
            $group = Group::query()->create([
                'name' => $name,
                'created_by_user_id' => $creator->id,
            ]);

            GroupMembership::query()->create([
                'group_id' => $group->id,
                'user_id' => $creator->id,
                'role' => GroupRole::ADMIN,
                'invited_by_user_id' => null,
                'start_at' => now(),
                'end_at' => null,
            ]);

            if ($petIds !== null && $petIds !== []) {
                $this->groupPets->addPets($group, $petIds, $creator);
            }

            return $group->fresh(['activeMemberships.user', 'activeGroupPets.pet']) ?? $group;
        });
    }

    public function update(Group $group, User $actor, string $name): Group
    {
        if (! $this->capabilities->canManage($actor, $group)) {
            throw GroupException::notGroupAdmin();
        }

        $group->update(['name' => $name]);

        return $group->fresh() ?? $group;
    }

    public function delete(Group $group, User $actor): void
    {
        if (! $this->capabilities->canManage($actor, $group)) {
            throw GroupException::notGroupAdmin();
        }

        $this->deleteWithoutActorAuthorization($group);
    }

    /**
     * Moderator entry point. The caller must authorize the moderator.
     */
    public function deleteAsModerator(Group $group): void
    {
        $this->deleteWithoutActorAuthorization($group);
    }

    private function deleteWithoutActorAuthorization(Group $group): void
    {
        DB::transaction(function () use ($group): void {
            Group::query()->whereKey($group->id)->lockForUpdate()->firstOrFail();

            $this->memberships->endAllActiveMemberships($group);
            $this->groupPets->endAllActiveAssignments($group);
            $this->invitations->handlerFor(ResourceInvitationType::GROUP)->revokePendingForTarget($group);
            $this->ledgerSync->onGroupDeleted($group);
            $group->delete();
        });
    }

    /**
     * @return Collection<int, Group>
     */
    public function listForUser(User $user): Collection
    {
        return Group::query()
            ->whereHas('activeMemberships', function ($query) use ($user): void {
                $query->where('user_id', $user->id);
            })
            ->with([
                'activeMemberships' => function ($query) use ($user): void {
                    $query->where('user_id', $user->id);
                },
                'activeGroupPets.pet.petType',
            ])
            ->withCount(['activeMemberships', 'activeGroupPets'])
            ->orderBy('name')
            ->get();
    }

    /**
     * @return array<string, mixed>
     */
    public function serialize(Group $group, ?User $viewer = null): array
    {
        $group->loadMissing([
            'activeMemberships.user',
            'activeGroupPets.pet.petType',
            'activeGroupPets.pet.media',
        ]);

        $viewerRole = $viewer === null ? null : $this->capabilities->roleFor($viewer, $group);

        /** @var list<array<string, mixed>> $pets */
        $pets = [];
        foreach ($group->activeGroupPets as $assignment) {
            $pet = $assignment->pet;

            $pets[] = [
                'id' => $pet?->id,
                'name' => $pet?->name,
                'photo_url' => $pet?->photo_url,
                'pet_type' => $pet?->petType === null ? null : [
                    'id' => $pet->petType->id,
                    'name' => $pet->petType->name,
                ],
            ];
        }

        /** @var list<array<string, mixed>> $members */
        $members = [];
        foreach ($group->activeMemberships as $membership) {
            $members[] = [
                'user_id' => $membership->user_id,
                'role' => $membership->role?->value,
                'start_at' => $membership->start_at,
                'user' => $membership->user === null ? null : [
                    'id' => $membership->user->id,
                    'name' => $membership->user->name,
                ],
            ];
        }

        return [
            'id' => $group->id,
            'name' => $group->name,
            'created_by_user_id' => $group->created_by_user_id,
            'created_at' => $group->created_at,
            'updated_at' => $group->updated_at,
            'viewer_role' => $viewerRole?->value,
            'member_count' => count($members),
            'pet_count' => count($pets),
            'pets' => $pets,
            'members' => $members,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeSummary(Group $group, User $viewer): array
    {
        $role = $this->capabilities->roleFor($viewer, $group);

        return [
            'id' => $group->id,
            'name' => $group->name,
            'viewer_role' => $role?->value,
            'member_count' => (int) ($group->active_memberships_count ?? $group->activeMemberships()->count()),
            'pet_count' => (int) ($group->active_group_pets_count ?? $group->activeGroupPets()->count()),
        ];
    }

    /**
     * Create a pet and assign it to the group atomically. Caller creates the Pet;
     * this assigns it after ownership exists.
     */
    public function assignNewlyCreatedPet(Group $group, Pet $pet, User $actor): GroupPet
    {
        return $this->groupPets->addPet($group, $pet, $actor);
    }
}
