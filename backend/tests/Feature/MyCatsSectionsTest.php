<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\OwnershipHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MyCatsSectionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_transferred_away_uses_ownership_history(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();

        // Currently owned cat by me (should be in owned, not in transferred_away)
        $ownedCat = Cat::factory()->create(['user_id' => $me->id]);
        // Ensure initial open ownership history (some test DBs may not have seeder/observer)
        OwnershipHistory::create([
            'cat_id' => $ownedCat->id,
            'user_id' => $me->id,
            'from_ts' => now()->subDays(5),
            'to_ts' => null,
        ]);

        // A cat I used to own, now owned by someone else
        $transferredCat = Cat::factory()->create(['user_id' => $other->id]);
        OwnershipHistory::create([
            'cat_id' => $transferredCat->id,
            'user_id' => $me->id,
            'from_ts' => now()->subDays(10),
            'to_ts' => now()->subDays(1),
        ]);

        $this->actingAs($me, 'sanctum');
        $resp = $this->getJson('/api/my-cats/sections');
        $resp->assertOk();

        $data = $resp->json('data');
        $ownedIds = collect($data['owned'])->pluck('id');
        $awayIds = collect($data['transferred_away'])->pluck('id');

        $this->assertTrue($ownedIds->contains($ownedCat->id));
        $this->assertFalse($awayIds->contains($ownedCat->id));

        $this->assertTrue($awayIds->contains($transferredCat->id));
    }
}
