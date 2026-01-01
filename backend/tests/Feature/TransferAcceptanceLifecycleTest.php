<?php

namespace Tests\Feature;

use App\Enums\FosterAssignmentStatus;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\TransferRequestStatus;
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
        $pet = $this->createPetWithOwner($owner);
        $placement = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::OPEN,
            'request_type' => PlacementRequestType::PERMANENT,
        ]);

        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        $loserHelper = User::factory()->create();
        $loserProfile = HelperProfile::factory()->create(['user_id' => $loserHelper->id]);

        // Two pending transfer requests for the same placement
        $accepted = TransferRequest::factory()->create([
            'pet_id' => $pet->id,
            'initiator_user_id' => $helper->id,
            'recipient_user_id' => $owner->id,
            'placement_request_id' => $placement->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => TransferRequestStatus::PENDING,
            'requested_relationship_type' => 'permanent_foster',
        ]);
        $otherPending = TransferRequest::factory()->create([
            'pet_id' => $pet->id,
            'initiator_user_id' => $loserHelper->id,
            'recipient_user_id' => $owner->id,
            'placement_request_id' => $placement->id,
            'helper_profile_id' => $loserProfile->id,
            'status' => TransferRequestStatus::PENDING,
            'requested_relationship_type' => 'permanent_foster',
        ]);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/transfer-requests/{$accepted->id}/accept");
        $response->assertStatus(200);

        // After accept, a handover should be created; ownership not yet transferred
        $this->assertPetOwnedBy($pet->fresh(), $owner);

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
        $this->assertPetOwnedBy($pet->fresh(), $helper);

        // Placement finalized and inactive (for permanent rehoming)
        $this->assertFalse($placement->fresh()->isActive());
        $this->assertEquals(PlacementRequestStatus::FINALIZED, $placement->fresh()->status);

        // Other pending auto-rejected
        $this->assertEquals(TransferRequestStatus::REJECTED, $otherPending->fresh()->status);
        $this->assertEquals(TransferRequestStatus::ACCEPTED, $accepted->fresh()->status);
    }

    public function test_accept_fostering_creates_assignment_and_keeps_owner(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placement = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::OPEN,
            'request_type' => PlacementRequestType::FOSTER_FREE,
        ]);

        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        $accepted = TransferRequest::factory()->create([
            'pet_id' => $pet->id,
            'initiator_user_id' => $helper->id,
            'recipient_user_id' => $owner->id,
            'placement_request_id' => $placement->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => TransferRequestStatus::PENDING,
            'requested_relationship_type' => 'fostering',
        ]);

        Sanctum::actingAs($owner);
        $response = $this->postJson("/api/transfer-requests/{$accepted->id}/accept");
        $response->assertStatus(200);

        // After accept, handover exists and owner remains
        $this->assertPetOwnedBy($pet->fresh(), $owner);

        $handover = \App\Models\TransferHandover::where('transfer_request_id', $accepted->id)->first();
        $this->assertNotNull($handover);

        // Helper confirms and complete
        \Laravel\Sanctum\Sanctum::actingAs($helper);
        $this->postJson("/api/transfer-handovers/{$handover->id}/confirm", [
            'condition_confirmed' => true,
        ])->assertStatus(200);
        \Laravel\Sanctum\Sanctum::actingAs($owner);
        $this->postJson("/api/transfer-handovers/{$handover->id}/complete")->assertStatus(200);

        // Owner remains for fostering handover
        $this->assertPetOwnedBy($pet->fresh(), $owner);

        // Placement active (for temporary fostering)
        $this->assertEquals(PlacementRequestStatus::ACTIVE, $placement->fresh()->status);

        // Foster assignment created on completion
        $this->assertDatabaseHas('foster_assignments', [
            'pet_id' => $pet->id,
            'owner_user_id' => $owner->id,
            'foster_user_id' => $helper->id,
            'status' => FosterAssignmentStatus::ACTIVE->value,
        ]);
    }

    public function test_fostering_uses_placement_request_type_even_if_transfer_requests_permanent(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placement = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::OPEN,
            'request_type' => PlacementRequestType::FOSTER_PAYED,
        ]);

        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        // Transfer request incorrectly flags permanent; placement should win
        $accepted = TransferRequest::factory()->create([
            'pet_id' => $pet->id,
            'initiator_user_id' => $helper->id,
            'recipient_user_id' => $owner->id,
            'placement_request_id' => $placement->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => TransferRequestStatus::PENDING,
            'requested_relationship_type' => 'permanent_foster',
        ]);

        Sanctum::actingAs($owner);
        $this->postJson("/api/transfer-requests/{$accepted->id}/accept")->assertStatus(200);

        $handover = \App\Models\TransferHandover::where('transfer_request_id', $accepted->id)->first();
        $this->assertNotNull($handover);

        \Laravel\Sanctum\Sanctum::actingAs($helper);
        $this->postJson("/api/transfer-handovers/{$handover->id}/confirm", [
            'condition_confirmed' => true,
        ])->assertStatus(200);

        // Owner completes
        \Laravel\Sanctum\Sanctum::actingAs($owner);
        $this->postJson("/api/transfer-handovers/{$handover->id}/complete")->assertStatus(200);

        // Owner remains; helper is foster via assignment
        $this->assertPetOwnedBy($pet->fresh(), $owner);
        $this->assertEquals(PlacementRequestStatus::ACTIVE, $placement->fresh()->status);
        $this->assertDatabaseHas('foster_assignments', [
            'pet_id' => $pet->id,
            'owner_user_id' => $owner->id,
            'foster_user_id' => $helper->id,
            'status' => FosterAssignmentStatus::ACTIVE->value,
        ]);
    }
}
