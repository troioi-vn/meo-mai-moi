<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PetRelationshipType;
use App\Enums\ResourceInvitationType;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\Ledger;
use App\Models\LedgerMembership;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection as SupportCollection;

class SharingSuggestionService
{
    /** @return Collection<int, User> */
    public function suggestionsFor(User $actor, ResourceInvitationType $type, Model $target): Collection
    {
        $excludeIds = $this->activeUserIdsForTarget($type, $target)
            ->push($actor->id)
            ->unique();

        $candidateIds = $this->petCollaboratorIds($actor)
            ->merge($this->groupCollaboratorIds($actor))
            ->merge($this->ledgerCollaboratorIds($actor))
            ->unique()
            ->diff($excludeIds)
            ->values();

        if ($candidateIds->isEmpty()) {
            return new Collection;
        }

        return User::query()
            ->whereIn('id', $candidateIds)
            ->orderBy('name')
            ->orderBy('id')
            ->get(['id', 'name']);
    }

    public function canDirectlyAdd(
        User $actor,
        ResourceInvitationType $type,
        Model $target,
        User $candidate,
    ): bool {
        return $this->suggestionsFor($actor, $type, $target)
            ->contains(fn (User $user): bool => $user->id === $candidate->id);
    }

    /** @return SupportCollection<int, int> */
    private function petCollaboratorIds(User $actor): SupportCollection
    {
        $roles = [
            PetRelationshipType::OWNER->value,
            PetRelationshipType::EDITOR->value,
            PetRelationshipType::VIEWER->value,
        ];
        $petIds = PetRelationship::query()
            ->where('user_id', $actor->id)
            ->whereNull('end_at')
            ->whereIn('relationship_type', $roles)
            ->pluck('pet_id');

        return PetRelationship::query()
            ->whereIn('pet_id', $petIds)
            ->whereNull('end_at')
            ->whereIn('relationship_type', $roles)
            ->where('user_id', '!=', $actor->id)
            ->pluck('user_id');
    }

    /** @return SupportCollection<int, int> */
    private function groupCollaboratorIds(User $actor): SupportCollection
    {
        $groupIds = GroupMembership::query()
            ->active()
            ->where('user_id', $actor->id)
            ->pluck('group_id');

        return GroupMembership::query()
            ->active()
            ->whereIn('group_id', $groupIds)
            ->where('user_id', '!=', $actor->id)
            ->pluck('user_id');
    }

    /** @return SupportCollection<int, int> */
    private function ledgerCollaboratorIds(User $actor): SupportCollection
    {
        $ledgerIds = LedgerMembership::query()
            ->active()
            ->where('user_id', $actor->id)
            ->pluck('ledger_id');

        return LedgerMembership::query()
            ->active()
            ->whereIn('ledger_id', $ledgerIds)
            ->where('user_id', '!=', $actor->id)
            ->pluck('user_id');
    }

    /** @return SupportCollection<int, int> */
    private function activeUserIdsForTarget(ResourceInvitationType $type, Model $target): SupportCollection
    {
        return match ($type) {
            ResourceInvitationType::PET => PetRelationship::query()
                ->where('pet_id', $this->targetId($target, Pet::class))
                ->whereNull('end_at')
                ->pluck('user_id'),
            ResourceInvitationType::GROUP => GroupMembership::query()
                ->active()
                ->where('group_id', $this->targetId($target, Group::class))
                ->pluck('user_id'),
            ResourceInvitationType::LEDGER => LedgerMembership::query()
                ->active()
                ->where('ledger_id', $this->targetId($target, Ledger::class))
                ->pluck('user_id'),
        };
    }

    /** @param class-string<Model> $expected */
    private function targetId(Model $target, string $expected): int
    {
        if (! $target instanceof $expected) {
            throw new \InvalidArgumentException('Sharing target does not match resource type.');
        }

        return (int) $target->getKey();
    }
}
