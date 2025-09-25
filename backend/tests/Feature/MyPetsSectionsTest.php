<?php

namespace Tests\Feature;

use App\Models\OwnershipHistory;
use App\Models\Pet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MyPetsSectionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_transferred_away_uses_ownership_history(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();

        // Currently owned pet by me (should be in owned, not in transferred_away)
        $ownedPet = Pet::factory()->create(['user_id' => $me->id]);
        OwnershipHistory::create([
            'pet_id' => $ownedPet->id,
            'user_id' => $me->id,
            'from_ts' => now()->subDays(5),
            'to_ts' => null,
        ]);

        // A pet I used to own, now owned by someone else
        $transferredPet = Pet::factory()->create(['user_id' => $other->id]);
        OwnershipHistory::create([
            'pet_id' => $transferredPet->id,
            'user_id' => $me->id,
            'from_ts' => now()->subDays(10),
            'to_ts' => now()->subDays(1),
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
