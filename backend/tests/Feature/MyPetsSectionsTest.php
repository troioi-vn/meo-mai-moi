<?php

namespace Tests\Feature;

use App\Enums\PetRelationshipType;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MyPetsSectionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_transferred_away_uses_pet_relationships(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();

        // Currently owned pet by me (should be in owned, not in transferred_away)
        $ownedPet = $this->createPetWithOwner($me);

        // A pet I used to own, now owned by someone else
        $transferredPet = $this->createPetWithOwner($other);

        // Create a past ownership relationship for me (ended)
        PetRelationship::create([
            'pet_id' => $transferredPet->id,
            'user_id' => $me->id,
            'relationship_type' => PetRelationshipType::OWNER,
            'start_at' => now()->subDays(10),
            'end_at' => now()->subDays(1),
            'created_by' => $me->id,
        ]);

        $this->actingAs($me, 'sanctum');
        $resp = $this->getJson('/api/my-pets/sections');
        $resp->assertOk();

        $data = $resp->json('data');
        $ownedIds = collect($data['owned'])->pluck('id');
        $awayIds = collect($data['transferred_away'])->pluck('id');

        $this->assertTrue($ownedIds->contains($ownedPet->id));
        $this->assertFalse($awayIds->contains($ownedPet->id));

        $this->assertTrue($awayIds->contains($transferredPet->id));
    }
}
