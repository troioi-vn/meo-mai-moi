<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\HelperProfile;
use App\Models\PlacementRequest;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TransferAcceptanceLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_accept_permanent_foster_transfers_ownership_and_fulfills_request(): void
    {
        $owner = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        $placement = PlacementRequest::factory()->create([
            'cat_id' => $cat->id,
            'user_id' => $owner->id,
            'is_active' => true,
            'status' => \App\Enums\PlacementRequestStatus::OPEN,
        ]);

        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        $loserHelper = User::factory()->create();
        $loserProfile = HelperProfile::factory()->create(['user_id' => $loserHelper->id]);

        // Two pending transfer requests for the same placement
        $accepted = TransferRequest::factory()->create([
            'cat_id' => $cat->id,
            'initiator_user_id' => $helper->id,
            'recipient_user_id' => $owner->id,
            'placement_request_id' => $placement->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => 'pending',
            'requested_relationship_type' => 'permanent_foster',
        ]);
        $otherPending = TransferRequest::factory()->create([
            'cat_id' => $cat->id,
            'initiator_user_id' => $loserHelper->id,
            'recipient_user_id' => $owner->id,
            'placement_request_id' => $placement->id,
            'helper_profile_id' => $loserProfile->id,
            'status' => 'pending',
            'requested_relationship_type' => 'permanent_foster',
        ]);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/transfer-requests/{$accepted->id}/accept");
        $response->assertStatus(200);

        // After accept, a handover should be created; ownership not yet transferred
        $this->assertEquals($owner->id, $cat->fresh()->user_id);

        $handover = \App\Models\TransferHandover::where('transfer_request_id', $accepted->id)->first();
        $this->assertNotNull($handover);

        // Helper confirms condition
        \Laravel\Sanctum\Sanctum::actingAs($helper);
        $confirm = $this->postJson("/api/transfer-handovers/{$handover->id}/confirm", [
            'condition_confirmed' => true,
            'condition_notes' => 'Matches profile',
        ]);
        $confirm->assertStatus(200);

        // Either party completes; owner completes here
        \Laravel\Sanctum\Sanctum::actingAs($owner);
        $complete = $this->postJson("/api/transfer-handovers/{$handover->id}/complete");
        $complete->assertStatus(200);

        // Ownership transferred to helper now
        $this->assertEquals($helper->id, $cat->fresh()->user_id);

    // Placement fulfilled and inactive
    $this->assertFalse((bool) $placement->fresh()->is_active);
        $this->assertEquals(\App\Enums\PlacementRequestStatus::FULFILLED, $placement->fresh()->status);

        // Other pending auto-rejected
        $this->assertEquals('rejected', $otherPending->fresh()->status);
        $this->assertEquals('accepted', $accepted->fresh()->status);
    }

    public function test_accept_fostering_creates_assignment_and_keeps_owner(): void
    {
        $owner = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        $placement = PlacementRequest::factory()->create([
            'cat_id' => $cat->id,
            'user_id' => $owner->id,
            'is_active' => true,
            'status' => \App\Enums\PlacementRequestStatus::OPEN,
        ]);

        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        $accepted = TransferRequest::factory()->create([
            'cat_id' => $cat->id,
            'initiator_user_id' => $helper->id,
            'recipient_user_id' => $owner->id,
            'placement_request_id' => $placement->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => 'pending',
            'requested_relationship_type' => 'fostering',
        ]);

        Sanctum::actingAs($owner);
        $response = $this->postJson("/api/transfer-requests/{$accepted->id}/accept");
        $response->assertStatus(200);

        // After accept, handover exists and owner remains
        $this->assertEquals($owner->id, $cat->fresh()->user_id);

        $handover = \App\Models\TransferHandover::where('transfer_request_id', $accepted->id)->first();
        $this->assertNotNull($handover);

        // Helper confirms and complete
        \Laravel\Sanctum\Sanctum::actingAs($helper);
        $this->postJson("/api/transfer-handovers/{$handover->id}/confirm", [
            'condition_confirmed' => true,
        ])->assertStatus(200);
        \Laravel\Sanctum\Sanctum::actingAs($owner);
        $this->postJson("/api/transfer-handovers/{$handover->id}/complete")->assertStatus(200);

    // Placement fulfilled
    $this->assertFalse((bool) $placement->fresh()->is_active);
        $this->assertEquals(\App\Enums\PlacementRequestStatus::FULFILLED, $placement->fresh()->status);

    // Foster assignment created on completion
    $this->assertDatabaseHas('foster_assignments', [
            'cat_id' => $cat->id,
            'owner_user_id' => $owner->id,
            'foster_user_id' => $helper->id,
            'status' => 'active',
        ]);
    }
}
