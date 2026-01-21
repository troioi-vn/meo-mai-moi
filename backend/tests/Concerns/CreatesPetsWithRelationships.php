<?php

namespace Tests\Concerns;

use App\Enums\PetRelationshipType;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\User;

trait CreatesPetsWithRelationships
{
    /**
     * Create a pet with an owner relationship
     */
    protected function createPetWithOwner(User $owner, array $attributes = []): Pet
    {
        $pet = Pet::factory()->create(array_merge([
            'created_by' => $owner->id,
        ], $attributes));

        // The factory should have created the relationship, but let's ensure it exists
        if (! PetRelationship::where('pet_id', $pet->id)
            ->where('user_id', $owner->id)
            ->where('relationship_type', PetRelationshipType::OWNER)
            ->whereNull('end_at')
            ->exists()) {

            PetRelationship::create([
                'user_id' => $owner->id,
                'pet_id' => $pet->id,
                'relationship_type' => PetRelationshipType::OWNER,
                'start_at' => now(),
                'end_at' => null,
                'created_by' => $owner->id,
            ]);
        }

        return $pet;
    }

    /**
     * Create a pet with multiple relationships
     */
    protected function createPetWithRelationships(User $creator, array $relationships = []): Pet
    {
        $pet = Pet::factory()->create([
            'created_by' => $creator->id,
        ]);

        foreach ($relationships as $relationship) {
            PetRelationship::create([
                'user_id' => $relationship['user']->id,
                'pet_id' => $pet->id,
                'relationship_type' => $relationship['type'],
                'start_at' => $relationship['start_at'] ?? now(),
                'end_at' => $relationship['end_at'] ?? null,
                'created_by' => $creator->id,
            ]);
        }

        return $pet;
    }
}
