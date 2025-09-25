<?php

namespace Tests\Unit\Policies;

use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlacementRequestPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_confirm_and_reject_placement_request(): void
    {
        $owner = User::factory()->create();
        $pet = Pet::factory()->create(['user_id' => $owner->id]);
        $placement = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'is_active' => true,
        ]);

        $this->actingAs($owner);
        $this->assertTrue($owner->can('confirm', $placement));
        $this->assertTrue($owner->can('reject', $placement));
    }

    public function test_non_owner_cannot_confirm_or_reject_placement_request_by_default(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $pet = Pet::factory()->create(['user_id' => $owner->id]);
        $placement = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'is_active' => true,
        ]);

        $this->actingAs($other);
        $this->assertFalse($other->can('confirm', $placement));
        $this->assertFalse($other->can('reject', $placement));
    }
}
