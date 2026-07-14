<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\GroupRole;
use App\Enums\PetRelationshipType;
use App\Enums\PetStatus;
use App\Enums\PlacementRequestStatus;
use App\Enums\TransferRequestStatus;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\User;
use Illuminate\Support\Collection;

class PetAccessService
{
    private const VIEWABLE_RELATIONSHIP_TYPES = [
        PetRelationshipType::OWNER,
        PetRelationshipType::EDITOR,
        PetRelationshipType::VIEWER,
        PetRelationshipType::FOSTER,
        PetRelationshipType::SITTER,
    ];

    private const EDITABLE_RELATIONSHIP_TYPES = [
        PetRelationshipType::OWNER,
        PetRelationshipType::EDITOR,
    ];

    /**
     * Whether the user may view the pet (direct relationship, Group membership, public visibility, or pending transfer).
     * Main-app authorization does not use global admin-role shortcuts.
     */
    public function canView(?User $user, Pet $pet): bool
    {
        $isPubliclyViewable = $this->isPubliclyViewable($pet);

        if (! $user) {
            return $isPubliclyViewable;
        }

        if ($this->hasDirectViewAccess($user, $pet)) {
            return true;
        }

        if ($this->hasGroupAccess($user, $pet)) {
            return true;
        }

        if ($this->isPendingTransferRecipient($pet, $user)) {
            return true;
        }

        return $isPubliclyViewable;
    }

    /**
     * Whether the user may edit the pet via direct owner/editor access or active Group membership.
     */
    public function canEdit(User $user, Pet $pet): bool
    {
        if ($this->hasActiveRelationshipType($user, $pet, self::EDITABLE_RELATIONSHIP_TYPES)) {
            return true;
        }

        return $this->hasGroupAccess($user, $pet);
    }

    /**
     * Whether the user has an active direct owner relationship.
     */
    public function isDirectOwner(User $user, Pet $pet): bool
    {
        return $this->hasActiveRelationshipType($user, $pet, [PetRelationshipType::OWNER]);
    }

    /**
     * People management (invite/remove/transfer) requires direct ownership.
     */
    public function canManagePeople(User $user, Pet $pet): bool
    {
        return $this->isDirectOwner($user, $pet);
    }

    /**
     * Delete requires direct ownership. Admin operational delete stays on Filament abilities.
     */
    public function canDelete(User $user, Pet $pet): bool
    {
        return $this->isDirectOwner($user, $pet);
    }

    /**
     * Ownership transfer requires direct ownership.
     */
    public function canTransferOwnership(User $user, Pet $pet): bool
    {
        return $this->isDirectOwner($user, $pet);
    }

    /**
     * @return list<array{type: string, role: string, id?: int, name?: string}>
     */
    public function accessSources(User $user, Pet $pet): array
    {
        return [
            ...$this->accessSourcesFromTypes($this->activeRelationshipTypesFor($user, $pet)),
            ...$this->groupAccessSourcesFor($user, $pet),
        ];
    }

    /**
     * Build viewer_permissions for authenticated private responses.
     *
     * @return array{
     *     can_edit: bool,
     *     can_delete: bool,
     *     can_manage_people: bool,
     *     can_transfer_ownership: bool,
     *     can_view_contact: bool,
     *     is_owner: bool,
     *     is_editor: bool,
     *     is_viewer: bool,
     *     is_foster: bool,
     *     is_sitter: bool,
     *     access_sources: list<array{type: string, role: string, id?: int, name?: string}>
     * }
     */
    public function viewerPermissions(User $user, Pet $pet): array
    {
        $types = $this->activeRelationshipTypesFor($user, $pet);
        $groupSources = $this->groupAccessSourcesFor($user, $pet);

        return $this->buildViewerPermissions($types, $groupSources);
    }

    /**
     * Public-safe subset of viewer permissions. Never includes access_sources.
     *
     * @return array{
     *     is_owner: bool,
     *     is_viewer: bool,
     *     has_active_relationship: bool
     * }
     */
    public function publicViewerPermissions(?User $user, Pet $pet): array
    {
        if (! $user instanceof User) {
            return [
                'is_owner' => false,
                'is_viewer' => false,
                'has_active_relationship' => false,
            ];
        }

        $types = $this->activeRelationshipTypesFor($user, $pet);
        $typeValues = array_map(static fn (PetRelationshipType $type): string => $type->value, $types);
        $hasGroupAccess = $this->hasGroupAccess($user, $pet);

        return [
            'is_owner' => in_array(PetRelationshipType::OWNER->value, $typeValues, true),
            'is_viewer' => in_array(PetRelationshipType::VIEWER->value, $typeValues, true),
            'has_active_relationship' => $types !== [] || $hasGroupAccess,
        ];
    }

    public function isPubliclyViewable(Pet $pet): bool
    {
        if ($pet->status === PetStatus::LOST) {
            return true;
        }

        return $pet->placementRequests()
            ->where('status', PlacementRequestStatus::OPEN)
            ->exists();
    }

    public function isPendingTransferRecipient(Pet $pet, User $user): bool
    {
        return $pet->placementRequests()
            ->where('status', PlacementRequestStatus::PENDING_TRANSFER)
            ->whereHas('transferRequests', function ($query) use ($user): void {
                $query->where('to_user_id', $user->id)
                    ->where('status', TransferRequestStatus::PENDING);
            })
            ->exists();
    }

    public function hasDirectViewAccess(User $user, Pet $pet): bool
    {
        return $this->hasActiveRelationshipType($user, $pet, self::VIEWABLE_RELATIONSHIP_TYPES);
    }

    public function hasGroupAccess(User $user, Pet $pet): bool
    {
        return GroupPet::query()
            ->where('pet_id', $pet->id)
            ->active()
            ->whereHas('group', function ($groupQuery) use ($user): void {
                $groupQuery->whereNull('deleted_at')
                    ->whereHas('activeMemberships', function ($membershipQuery) use ($user): void {
                        $membershipQuery->where('user_id', $user->id);
                    });
            })
            ->exists();
    }

    /**
     * Build pet sections for All pets or a specific Group context.
     *
     * @return array{
     *     owned: Collection<int, Pet>,
     *     fostering_active: Collection<int, Pet>,
     *     shared: Collection<int, Pet>,
     *     fostering_past: Collection<int, Pet>,
     *     context: array{type: string, group_id?: int, group_name?: string}
     * }
     */
    public function sectionsForUser(User $user, ?int $groupId = null): array
    {
        if ($groupId !== null) {
            return $this->sectionsForGroupContext($user, $groupId);
        }

        return $this->sectionsForAllContext($user);
    }

    /**
     * @param  Collection<int, Pet>  $pets
     */
    public function attachViewerPermissions(Collection $pets, User $user): void
    {
        if ($pets->isEmpty()) {
            return;
        }

        $petIds = $pets->pluck('id')->map(static fn ($id): int => (int) $id)->all();
        $typesByPetId = $this->activeRelationshipTypesByPetIds($user, $petIds);
        $groupSourcesByPetId = $this->groupAccessSourcesByPetIds($user, $petIds);

        foreach ($pets as $pet) {
            $petId = (int) $pet->id;
            $pet->setAttribute(
                'viewer_permissions',
                $this->buildViewerPermissions(
                    $typesByPetId[$petId] ?? [],
                    $groupSourcesByPetId[$petId] ?? []
                )
            );
        }
    }

    /**
     * @return array{
     *     owned: Collection<int, Pet>,
     *     fostering_active: Collection<int, Pet>,
     *     shared: Collection<int, Pet>,
     *     fostering_past: Collection<int, Pet>,
     *     context: array{type: string}
     * }
     */
    private function sectionsForAllContext(User $user): array
    {
        $activeRelationships = PetRelationship::query()
            ->where('user_id', $user->id)
            ->whereNull('end_at')
            ->get(['pet_id', 'relationship_type']);

        /** @var array<int, list<PetRelationshipType>> $activeTypesByPetId */
        $activeTypesByPetId = [];
        foreach ($activeRelationships as $relationship) {
            $petId = (int) $relationship->pet_id;
            $type = $relationship->relationship_type;
            if (! $type instanceof PetRelationshipType) {
                continue;
            }
            $activeTypesByPetId[$petId][] = $type;
        }

        $groupPetIds = $this->activeGroupPetIdsForUser($user);
        $groupSourcesByPetId = $this->groupAccessSourcesByPetIds($user, $groupPetIds);

        $ownedIds = [];
        $fosteringActiveIds = [];
        $sharedIds = [];

        foreach ($activeTypesByPetId as $petId => $types) {
            $values = array_map(static fn (PetRelationshipType $type): string => $type->value, $types);

            if (in_array(PetRelationshipType::OWNER->value, $values, true)) {
                $ownedIds[] = $petId;
            } elseif (in_array(PetRelationshipType::FOSTER->value, $values, true)) {
                $fosteringActiveIds[] = $petId;
            } else {
                $sharedIds[] = $petId;
            }
        }

        foreach ($groupPetIds as $petId) {
            if (isset($activeTypesByPetId[$petId])) {
                continue;
            }
            $sharedIds[] = $petId;
        }

        $sharedIds = array_values(array_unique($sharedIds));
        $currentAccessIds = array_unique([...$ownedIds, ...$fosteringActiveIds, ...$sharedIds]);

        $pastFosterIds = PetRelationship::query()
            ->where('user_id', $user->id)
            ->where('relationship_type', PetRelationshipType::FOSTER)
            ->whereNotNull('end_at')
            ->pluck('pet_id')
            ->map(static fn ($id): int => (int) $id)
            ->unique()
            ->reject(static fn (int $petId): bool => in_array($petId, $currentAccessIds, true))
            ->values()
            ->all();

        $allPetIds = array_values(array_unique([...$currentAccessIds, ...$pastFosterIds]));

        $sections = $this->hydrateSections(
            $user,
            $allPetIds,
            $ownedIds,
            $fosteringActiveIds,
            $sharedIds,
            $pastFosterIds,
            $activeTypesByPetId,
            $groupSourcesByPetId
        );

        $sections['context'] = ['type' => 'all'];

        return $sections;
    }

    /**
     * @return array{
     *     owned: Collection<int, Pet>,
     *     fostering_active: Collection<int, Pet>,
     *     shared: Collection<int, Pet>,
     *     fostering_past: Collection<int, Pet>,
     *     context: array{type: string, group_id: int, group_name: string}
     * }
     */
    private function sectionsForGroupContext(User $user, int $groupId): array
    {
        /** @var Group $group */
        $group = Group::query()->findOrFail($groupId);

        $isMember = GroupMembership::query()
            ->where('group_id', $group->id)
            ->where('user_id', $user->id)
            ->active()
            ->exists();

        if (! $isMember) {
            abort(403);
        }

        $groupPetIds = GroupPet::query()
            ->where('group_id', $group->id)
            ->active()
            ->pluck('pet_id')
            ->map(static fn ($id): int => (int) $id)
            ->unique()
            ->values()
            ->all();

        $activeTypesByPetId = $this->activeRelationshipTypesByPetIds($user, $groupPetIds);
        $groupSourcesByPetId = $this->groupAccessSourcesByPetIds($user, $groupPetIds);

        $ownedIds = [];
        $fosteringActiveIds = [];
        $sharedIds = [];

        foreach ($groupPetIds as $petId) {
            $types = $activeTypesByPetId[$petId] ?? [];
            $values = array_map(static fn (PetRelationshipType $type): string => $type->value, $types);

            if (in_array(PetRelationshipType::OWNER->value, $values, true)) {
                $ownedIds[] = $petId;
            } elseif (in_array(PetRelationshipType::FOSTER->value, $values, true)) {
                $fosteringActiveIds[] = $petId;
            } else {
                $sharedIds[] = $petId;
            }
        }

        $sections = $this->hydrateSections(
            $user,
            $groupPetIds,
            $ownedIds,
            $fosteringActiveIds,
            $sharedIds,
            [],
            $activeTypesByPetId,
            $groupSourcesByPetId
        );

        $sections['context'] = [
            'type' => 'group',
            'group_id' => $group->id,
            'group_name' => $group->name,
        ];

        return $sections;
    }

    /**
     * @param  list<int>  $allPetIds
     * @param  list<int>  $ownedIds
     * @param  list<int>  $fosteringActiveIds
     * @param  list<int>  $sharedIds
     * @param  list<int>  $pastFosterIds
     * @param  array<int, list<PetRelationshipType>>  $activeTypesByPetId
     * @param  array<int, list<array{type: string, role: string, id: int, name: string}>>  $groupSourcesByPetId
     * @return array{
     *     owned: Collection<int, Pet>,
     *     fostering_active: Collection<int, Pet>,
     *     shared: Collection<int, Pet>,
     *     fostering_past: Collection<int, Pet>
     * }
     */
    private function hydrateSections(
        User $user,
        array $allPetIds,
        array $ownedIds,
        array $fosteringActiveIds,
        array $sharedIds,
        array $pastFosterIds,
        array $activeTypesByPetId,
        array $groupSourcesByPetId,
    ): array {
        if ($allPetIds === []) {
            return [
                'owned' => collect(),
                'fostering_active' => collect(),
                'shared' => collect(),
                'fostering_past' => collect(),
            ];
        }

        /** @var Collection<int, Pet> $pets */
        $pets = Pet::query()
            ->whereIn('id', $allPetIds)
            ->with('petType')
            ->withCardHealthSummary()
            ->get()
            ->keyBy('id');

        $owned = collect();
        $fosteringActive = collect();
        $shared = collect();
        $fosteringPast = collect();

        foreach ($ownedIds as $petId) {
            $pet = $pets->get($petId);
            if ($pet instanceof Pet) {
                $this->attachViewerPermissionsFromSources(
                    $pet,
                    $activeTypesByPetId[$petId] ?? [],
                    $groupSourcesByPetId[$petId] ?? []
                );
                $pet->append('health_summary');
                $owned->push($pet);
            }
        }

        foreach ($fosteringActiveIds as $petId) {
            $pet = $pets->get($petId);
            if ($pet instanceof Pet) {
                $this->attachViewerPermissionsFromSources(
                    $pet,
                    $activeTypesByPetId[$petId] ?? [],
                    $groupSourcesByPetId[$petId] ?? []
                );
                $pet->append('health_summary');
                $fosteringActive->push($pet);
            }
        }

        foreach ($sharedIds as $petId) {
            $pet = $pets->get($petId);
            if ($pet instanceof Pet) {
                $this->attachViewerPermissionsFromSources(
                    $pet,
                    $activeTypesByPetId[$petId] ?? [],
                    $groupSourcesByPetId[$petId] ?? []
                );
                $pet->append('health_summary');
                $shared->push($pet);
            }
        }

        foreach ($pastFosterIds as $petId) {
            $pet = $pets->get($petId);
            if ($pet instanceof Pet) {
                $pet->setAttribute('viewer_permissions', $this->emptyViewerPermissions());
                $pet->append('health_summary');
                $fosteringPast->push($pet);
            }
        }

        return [
            'owned' => $owned->values(),
            'fostering_active' => $fosteringActive->values(),
            'shared' => $shared->values(),
            'fostering_past' => $fosteringPast->values(),
        ];
    }

    /**
     * @return list<int>
     */
    private function activeGroupPetIdsForUser(User $user): array
    {
        return GroupPet::query()
            ->active()
            ->whereHas('group', function ($groupQuery) use ($user): void {
                $groupQuery->whereNull('deleted_at')
                    ->whereHas('activeMemberships', function ($membershipQuery) use ($user): void {
                        $membershipQuery->where('user_id', $user->id);
                    });
            })
            ->pluck('pet_id')
            ->map(static fn ($id): int => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  list<PetRelationshipType>  $types
     * @param  list<array{type: string, role: string, id?: int, name?: string}>  $groupSources
     * @return array{
     *     can_edit: bool,
     *     can_delete: bool,
     *     can_manage_people: bool,
     *     can_transfer_ownership: bool,
     *     can_view_contact: bool,
     *     is_owner: bool,
     *     is_editor: bool,
     *     is_viewer: bool,
     *     is_foster: bool,
     *     is_sitter: bool,
     *     access_sources: list<array{type: string, role: string, id?: int, name?: string}>
     * }
     */
    private function buildViewerPermissions(array $types, array $groupSources): array
    {
        $typeValues = array_map(static fn (PetRelationshipType $type): string => $type->value, $types);
        $isOwner = in_array(PetRelationshipType::OWNER->value, $typeValues, true);
        $hasDirectEdit = $isOwner || in_array(PetRelationshipType::EDITOR->value, $typeValues, true);
        $canEdit = $hasDirectEdit || $groupSources !== [];

        return [
            'can_edit' => $canEdit,
            'can_delete' => $isOwner,
            'can_manage_people' => $isOwner,
            'can_transfer_ownership' => $isOwner,
            'can_view_contact' => ! $isOwner,
            'is_owner' => $isOwner,
            'is_editor' => in_array(PetRelationshipType::EDITOR->value, $typeValues, true),
            'is_viewer' => in_array(PetRelationshipType::VIEWER->value, $typeValues, true),
            'is_foster' => in_array(PetRelationshipType::FOSTER->value, $typeValues, true),
            'is_sitter' => in_array(PetRelationshipType::SITTER->value, $typeValues, true),
            'access_sources' => [
                ...$this->accessSourcesFromTypes($types),
                ...$groupSources,
            ],
        ];
    }

    /**
     * @param  list<PetRelationshipType>  $types
     * @param  list<array{type: string, role: string, id?: int, name?: string}>  $groupSources
     */
    private function attachViewerPermissionsFromSources(Pet $pet, array $types, array $groupSources): void
    {
        $pet->setAttribute('viewer_permissions', $this->buildViewerPermissions($types, $groupSources));
    }

    /**
     * @return array{
     *     can_edit: bool,
     *     can_delete: bool,
     *     can_manage_people: bool,
     *     can_transfer_ownership: bool,
     *     can_view_contact: bool,
     *     is_owner: bool,
     *     is_editor: bool,
     *     is_viewer: bool,
     *     is_foster: bool,
     *     is_sitter: bool,
     *     access_sources: list<array{type: string, role: string}>
     * }
     */
    private function emptyViewerPermissions(): array
    {
        return [
            'can_edit' => false,
            'can_delete' => false,
            'can_manage_people' => false,
            'can_transfer_ownership' => false,
            'can_view_contact' => false,
            'is_owner' => false,
            'is_editor' => false,
            'is_viewer' => false,
            'is_foster' => false,
            'is_sitter' => false,
            'access_sources' => [],
        ];
    }

    /**
     * @param  list<PetRelationshipType>  $types
     * @return list<array{type: string, role: string}>
     */
    private function accessSourcesFromTypes(array $types): array
    {
        $sources = [];
        foreach ($types as $type) {
            $sources[] = [
                'type' => 'relationship',
                'role' => $type->value,
            ];
        }

        return $sources;
    }

    /**
     * @return list<array{type: string, role: string, id: int, name: string}>
     */
    private function groupAccessSourcesFor(User $user, Pet $pet): array
    {
        $byPet = $this->groupAccessSourcesByPetIds($user, [$pet->id]);

        return $byPet[$pet->id] ?? [];
    }

    /**
     * @param  list<int>  $petIds
     * @return array<int, list<array{type: string, role: string, id: int, name: string}>>
     */
    private function groupAccessSourcesByPetIds(User $user, array $petIds): array
    {
        if ($petIds === []) {
            return [];
        }

        $rows = GroupMembership::query()
            ->select([
                'group_memberships.role',
                'groups.id as group_id',
                'groups.name as group_name',
                'group_pets.pet_id',
            ])
            ->join('groups', 'groups.id', '=', 'group_memberships.group_id')
            ->join('group_pets', 'group_pets.group_id', '=', 'groups.id')
            ->where('group_memberships.user_id', $user->id)
            ->whereNull('group_memberships.end_at')
            ->whereNull('group_pets.end_at')
            ->whereNull('groups.deleted_at')
            ->whereIn('group_pets.pet_id', $petIds)
            ->get();

        /** @var array<int, list<array{type: string, role: string, id: int, name: string}>> $sourcesByPetId */
        $sourcesByPetId = [];

        foreach ($rows as $row) {
            $petId = (int) $row->pet_id;
            $role = $row->role instanceof GroupRole
                ? $row->role
                : GroupRole::tryFrom((string) $row->role);

            if ($role === null) {
                continue;
            }

            $sourcesByPetId[$petId][] = [
                'type' => 'group',
                'id' => (int) $row->group_id,
                'name' => (string) $row->group_name,
                'role' => $role->value,
            ];
        }

        return $sourcesByPetId;
    }

    /**
     * @param  list<int>  $petIds
     * @return array<int, list<PetRelationshipType>>
     */
    private function activeRelationshipTypesByPetIds(User $user, array $petIds): array
    {
        if ($petIds === []) {
            return [];
        }

        $relationships = PetRelationship::query()
            ->where('user_id', $user->id)
            ->whereIn('pet_id', $petIds)
            ->whereNull('end_at')
            ->get(['pet_id', 'relationship_type']);

        /** @var array<int, list<PetRelationshipType>> $typesByPetId */
        $typesByPetId = [];
        foreach ($relationships as $relationship) {
            $petId = (int) $relationship->pet_id;
            $type = $relationship->relationship_type;
            if (! $type instanceof PetRelationshipType) {
                continue;
            }
            $typesByPetId[$petId][] = $type;
        }

        return $typesByPetId;
    }

    /**
     * @return list<PetRelationshipType>
     */
    private function activeRelationshipTypesFor(User $user, Pet $pet): array
    {
        if ($pet->relationLoaded('relationships')) {
            return $pet->relationships
                ->filter(
                    static fn (PetRelationship $relationship): bool => (int) $relationship->user_id === (int) $user->id
                        && $relationship->end_at === null
                        && $relationship->relationship_type instanceof PetRelationshipType
                )
                ->map(static fn (PetRelationship $relationship): PetRelationshipType => $relationship->relationship_type)
                ->values()
                ->all();
        }

        return PetRelationship::query()
            ->where('pet_id', $pet->id)
            ->where('user_id', $user->id)
            ->whereNull('end_at')
            ->pluck('relationship_type')
            ->filter(static fn ($type): bool => $type instanceof PetRelationshipType)
            ->values()
            ->all();
    }

    /**
     * @param  list<PetRelationshipType>  $types
     */
    private function hasActiveRelationshipType(User $user, Pet $pet, array $types): bool
    {
        if ($types === []) {
            return false;
        }

        if ($pet->relationLoaded('relationships')) {
            return $pet->relationships->contains(
                static function (PetRelationship $relationship) use ($user, $types): bool {
                    return (int) $relationship->user_id === (int) $user->id
                        && $relationship->end_at === null
                        && $relationship->relationship_type instanceof PetRelationshipType
                        && in_array($relationship->relationship_type, $types, true);
                }
            );
        }

        return PetRelationship::query()
            ->where('pet_id', $pet->id)
            ->where('user_id', $user->id)
            ->whereNull('end_at')
            ->whereIn('relationship_type', $types)
            ->exists();
    }
}
