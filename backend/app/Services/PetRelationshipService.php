<?php

namespace App\Services;

use App\Enums\PetRelationshipType;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\User;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Collection;

class PetRelationshipService
{
    /**
     * Create a new pet relationship
     */
    public function createRelationship(
        User $user,
        Pet $pet,
        PetRelationshipType $type,
        User $createdBy,
        ?DateTimeInterface $startAt = null
    ): PetRelationship {
        return PetRelationship::create([
            'user_id' => $user->id,
            'pet_id' => $pet->id,
            'relationship_type' => $type,
            'start_at' => $startAt ?? now(),
            'end_at' => null,
            'created_by' => $createdBy->id,
        ]);
    }

    /**
     * End a relationship by setting end_at
     */
    public function endRelationship(PetRelationship $relationship, ?DateTimeInterface $endAt = null): PetRelationship
    {
        $relationship->update([
            'end_at' => $endAt ?? now(),
        ]);

        return $relationship->fresh();
    }

    /**
     * End all active relationships for a user and pet.
     */
    public function endAllActiveRelationships(User $user, Pet $pet, ?DateTimeInterface $endAt = null): void
    {
        PetRelationship::where('user_id', $user->id)
            ->where('pet_id', $pet->id)
            ->whereNull('end_at')
            ->update(['end_at' => $endAt ?? now()]);
    }

    /**
     * End active relationships for a user and pet, limited to given types.
     *
     * @param  array<PetRelationshipType>  $types
     */
    public function endActiveRelationshipsByTypes(
        User $user,
        Pet $pet,
        array $types,
        ?DateTimeInterface $endAt = null
    ): void {
        $typeValues = collect($types)
            ->map(fn (PetRelationshipType $t) => $t->value)
            ->values()
            ->all();

        PetRelationship::where('user_id', $user->id)
            ->where('pet_id', $pet->id)
            ->whereNull('end_at')
            ->whereIn('relationship_type', $typeValues)
            ->update(['end_at' => $endAt ?? now()]);
    }

    /**
     * Transfer ownership from one user to another
     */
    public function transferOwnership(Pet $pet, User $fromUser, User $toUser, User $createdBy): void
    {
        if ($fromUser->id === $toUser->id) {
            return;
        }

        // End current ownership for the source user
        $currentOwnership = PetRelationship::where('pet_id', $pet->id)
            ->where('user_id', $fromUser->id)
            ->where('relationship_type', PetRelationshipType::OWNER)
            ->whereNull('end_at')
            ->first();

        if ($currentOwnership) {
            $this->endRelationship($currentOwnership);
        }

        // End ANY active relationship the recipient has (foster, sitter, viewer)
        // before making them the owner to keep things clean.
        $this->endAllActiveRelationships($toUser, $pet);

        // Create new ownership
        $this->createRelationship($toUser, $pet, PetRelationshipType::OWNER, $createdBy);
    }

    /**
     * Add foster access to a pet (idempotent).
     */
    public function addFoster(
        Pet $pet,
        User $foster,
        User $createdBy,
        ?DateTimeInterface $startAt = null
    ): PetRelationship {
        $existing = PetRelationship::where('pet_id', $pet->id)
            ->where('user_id', $foster->id)
            ->where('relationship_type', PetRelationshipType::FOSTER)
            ->whereNull('end_at')
            ->first();

        if ($existing) {
            return $existing;
        }

        return $this->createRelationship($foster, $pet, PetRelationshipType::FOSTER, $createdBy, $startAt);
    }

    /**
     * Add sitter access to a pet (idempotent).
     */
    public function addSitter(
        Pet $pet,
        User $sitter,
        User $createdBy,
        ?DateTimeInterface $startAt = null
    ): PetRelationship {
        $existing = PetRelationship::where('pet_id', $pet->id)
            ->where('user_id', $sitter->id)
            ->where('relationship_type', PetRelationshipType::SITTER)
            ->whereNull('end_at')
            ->first();

        if ($existing) {
            return $existing;
        }

        return $this->createRelationship($sitter, $pet, PetRelationshipType::SITTER, $createdBy, $startAt);
    }

    /**
     * Get all active relationships for a pet
     */
    public function getActiveRelationships(Pet $pet): Collection
    {
        return $pet->relationships()
            ->with(['user', 'creator'])
            ->whereNull('end_at')
            ->orderBy('relationship_type')
            ->orderBy('start_at')
            ->get();
    }

    /**
     * Get relationship history for a pet
     */
    public function getRelationshipHistory(Pet $pet): Collection
    {
        return $pet->relationships()
            ->with(['user', 'creator'])
            ->orderBy('start_at', 'desc')
            ->get();
    }

    /**
     * Check if user has active relationship of specific type with pet
     */
    public function hasActiveRelationship(User $user, Pet $pet, PetRelationshipType $type): bool
    {
        return PetRelationship::where('user_id', $user->id)
            ->where('pet_id', $pet->id)
            ->where('relationship_type', $type)
            ->whereNull('end_at')
            ->exists();
    }

    /**
     * Get all pets with specific relationship type for a user
     */
    public function getPetsByRelationshipType(User $user, PetRelationshipType $type): Collection
    {
        return Pet::whereHas('relationships', function ($query) use ($user, $type) {
            $query->where('user_id', $user->id)
                ->where('relationship_type', $type)
                ->whereNull('end_at');
        })->with(['petType', 'relationships' => function ($query) use ($user, $type) {
            $query->where('user_id', $user->id)
                ->where('relationship_type', $type)
                ->whereNull('end_at');
        }])->get();
    }

    /**
     * Add viewer access to a pet
     */
    public function addViewer(Pet $pet, User $viewer, User $createdBy): PetRelationship
    {
        // Check if viewer relationship already exists
        $existing = PetRelationship::where('pet_id', $pet->id)
            ->where('user_id', $viewer->id)
            ->where('relationship_type', PetRelationshipType::VIEWER)
            ->whereNull('end_at')
            ->first();

        if ($existing) {
            return $existing;
        }

        return $this->createRelationship($viewer, $pet, PetRelationshipType::VIEWER, $createdBy);
    }

    /**
     * Add editor access to a pet
     */
    public function addEditor(Pet $pet, User $editor, User $createdBy): PetRelationship
    {
        // Check if editor relationship already exists
        $existing = PetRelationship::where('pet_id', $pet->id)
            ->where('user_id', $editor->id)
            ->where('relationship_type', PetRelationshipType::EDITOR)
            ->whereNull('end_at')
            ->first();

        if ($existing) {
            return $existing;
        }

        return $this->createRelationship($editor, $pet, PetRelationshipType::EDITOR, $createdBy);
    }

    /**
     * Sync relationships of a specific type for a pet
     */
    public function syncRelationships(Pet $pet, array $userIds, PetRelationshipType $type, User $createdBy): void
    {
        $desiredIds = collect($userIds)->map(fn ($id) => (int) $id)->unique()->values();

        $activeRelationships = PetRelationship::where('pet_id', $pet->id)
            ->where('relationship_type', $type)
            ->whereNull('end_at')
            ->get();

        $activeUserIds = $activeRelationships->pluck('user_id')->map(fn ($id) => (int) $id);

        // End relationships for users no longer in the list
        $idsToEnd = $activeUserIds->diff($desiredIds);
        if ($idsToEnd->isNotEmpty()) {
            PetRelationship::where('pet_id', $pet->id)
                ->where('relationship_type', $type)
                ->whereNull('end_at')
                ->whereIn('user_id', $idsToEnd)
                ->update(['end_at' => now()]);
        }

        // Create new relationships for users not yet in the list
        $idsToCreate = $desiredIds->diff($activeUserIds);
        foreach ($idsToCreate as $userId) {
            $user = User::find($userId);
            if ($user) {
                $this->createRelationship($user, $pet, $type, $createdBy);
            }
        }
    }

    /**
     * Remove user's access to a pet (end all active relationships)
     */
    public function removeUserAccess(Pet $pet, User $user): void
    {
        PetRelationship::where('pet_id', $pet->id)
            ->where('user_id', $user->id)
            ->whereNull('end_at')
            ->update(['end_at' => now()]);
    }
}
