<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PetRelationshipType;
use App\Enums\PetStatus;
use App\Enums\PlacementRequestStatus;
use App\Enums\TransferRequestStatus;
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
     * Whether the user may view the pet (direct relationship, public visibility, or pending transfer).
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

        if ($this->isPendingTransferRecipient($pet, $user)) {
            return true;
        }

        return $isPubliclyViewable;
    }

    /**
     * Whether the user may edit the pet via direct owner/editor access (or future Group access).
     */
    public function canEdit(User $user, Pet $pet): bool
    {
        return $this->hasActiveRelationshipType($user, $pet, self::EDITABLE_RELATIONSHIP_TYPES);
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
     * @return list<array{type: string, role: string}>
     */
    public function accessSources(User $user, Pet $pet): array
    {
        $types = $this->activeRelationshipTypesFor($user, $pet);

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
     *     access_sources: list<array{type: string, role: string}>
     * }
     */
    public function viewerPermissions(User $user, Pet $pet): array
    {
        $types = $this->activeRelationshipTypesFor($user, $pet);
        $typeValues = array_map(static fn (PetRelationshipType $type): string => $type->value, $types);

        $isOwner = in_array(PetRelationshipType::OWNER->value, $typeValues, true);
        $canEdit = $isOwner || in_array(PetRelationshipType::EDITOR->value, $typeValues, true);

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
            'access_sources' => $this->accessSourcesFromTypes($types),
        ];
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

        return [
            'is_owner' => in_array(PetRelationshipType::OWNER->value, $typeValues, true),
            'is_viewer' => in_array(PetRelationshipType::VIEWER->value, $typeValues, true),
            'has_active_relationship' => $types !== [],
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

    /**
     * Build All-pets sections with deduplication priority:
     * owned > fostering_active > shared > fostering_past.
     *
     * @return array{
     *     owned: Collection<int, Pet>,
     *     fostering_active: Collection<int, Pet>,
     *     shared: Collection<int, Pet>,
     *     fostering_past: Collection<int, Pet>
     * }
     */
    public function sectionsForUser(User $user): array
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
                $this->attachViewerPermissionsFromTypes($pet, $user, $activeTypesByPetId[$petId] ?? []);
                $pet->append('health_summary');
                $owned->push($pet);
            }
        }

        foreach ($fosteringActiveIds as $petId) {
            $pet = $pets->get($petId);
            if ($pet instanceof Pet) {
                $this->attachViewerPermissionsFromTypes($pet, $user, $activeTypesByPetId[$petId] ?? []);
                $pet->append('health_summary');
                $fosteringActive->push($pet);
            }
        }

        foreach ($sharedIds as $petId) {
            $pet = $pets->get($petId);
            if ($pet instanceof Pet) {
                $this->attachViewerPermissionsFromTypes($pet, $user, $activeTypesByPetId[$petId] ?? []);
                $pet->append('health_summary');
                $shared->push($pet);
            }
        }

        foreach ($pastFosterIds as $petId) {
            $pet = $pets->get($petId);
            if ($pet instanceof Pet) {
                // Past foster with no current access: permissions reflect no active relationship.
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
     * @param  Collection<int, Pet>  $pets
     */
    public function attachViewerPermissions(Collection $pets, User $user): void
    {
        if ($pets->isEmpty()) {
            return;
        }

        $petIds = $pets->pluck('id')->map(static fn ($id): int => (int) $id)->all();

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

        foreach ($pets as $pet) {
            $this->attachViewerPermissionsFromTypes($pet, $user, $typesByPetId[(int) $pet->id] ?? []);
        }
    }

    /**
     * @param  list<PetRelationshipType>  $types
     */
    private function attachViewerPermissionsFromTypes(Pet $pet, User $user, array $types): void
    {
        $typeValues = array_map(static fn (PetRelationshipType $type): string => $type->value, $types);
        $isOwner = in_array(PetRelationshipType::OWNER->value, $typeValues, true);
        $canEdit = $isOwner || in_array(PetRelationshipType::EDITOR->value, $typeValues, true);

        $pet->setAttribute('viewer_permissions', [
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
            'access_sources' => $this->accessSourcesFromTypes($types),
        ]);
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
