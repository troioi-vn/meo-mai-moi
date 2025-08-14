<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\PlacementRequest;
use App\Models\User;
use App\Enums\PlacementRequestType;
use App\Enums\PlacementRequestStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlacementRequestActionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_delete_a_placement_request()
    {
        // Create owner explicitly
        $owner = User::factory()->create();
        
        // Create cat explicitly
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        
        // Create placement request DIRECTLY without factory to ensure explicit control
        $placementRequest = new PlacementRequest();
        $placementRequest->cat_id = $cat->id;
        $placementRequest->user_id = $owner->id;  // Explicitly set user_id
        $placementRequest->request_type = PlacementRequestType::PERMANENT;
        $placementRequest->status = PlacementRequestStatus::OPEN;
        $placementRequest->notes = 'Test placement request';
        $placementRequest->is_active = true;
        $placementRequest->save();
        
        // Verify the user_id was actually saved
        $this->assertEquals($owner->id, $placementRequest->fresh()->user_id, 'PlacementRequest user_id should match owner id');

        Sanctum::actingAs($owner);

        $response = $this->deleteJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('placement_requests', ['id' => $placementRequest->id]);
    }

    public function test_non_owner_cannot_delete_a_placement_request()
    {
        $owner = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        $placementRequest = PlacementRequest::factory()->create(['cat_id' => $cat->id, 'user_id' => $owner->id]);
        $nonOwner = User::factory()->create();

        Sanctum::actingAs($nonOwner);

        $response = $this->deleteJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('placement_requests', ['id' => $placementRequest->id]);
    }
}