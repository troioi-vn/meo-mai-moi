<?php

namespace Tests\Feature;

use App\Enums\PlacementResponseStatus;
use App\Models\HelperProfile;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlacementRequestResponseApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;

    protected User $helper;

    protected Pet $pet;

    protected PlacementRequest $placementRequest;

    protected HelperProfile $helperProfile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create();
        $this->helper = User::factory()->create();
        $this->helperProfile = HelperProfile::factory()->create(['user_id' => $this->helper->id]);

        $this->pet = Pet::factory()->create(['created_by' => $this->owner->id]);
        $this->placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $this->pet->id,
            'user_id' => $this->owner->id,
            'status' => \App\Enums\PlacementRequestStatus::OPEN,
        ]);
    }

    public function test_helper_can_respond_to_placement_request()
    {
        $this->actingAs($this->helper);

        $response = $this->postJson("/api/placement-requests/{$this->placementRequest->id}/responses", [
            'message' => 'I want to help!',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'responded')
            ->assertJsonPath('data.message', 'I want to help!');

        $this->assertDatabaseHas('placement_request_responses', [
            'placement_request_id' => $this->placementRequest->id,
            'helper_profile_id' => $this->helperProfile->id,
            'status' => 'responded',
        ]);
    }

    public function test_owner_cannot_respond_to_own_placement_request()
    {
        $this->actingAs($this->owner);

        $response = $this->postJson("/api/placement-requests/{$this->placementRequest->id}/responses", [
            'message' => 'I want to help myself?',
        ]);

        $response->assertStatus(403);
    }

    public function test_owner_can_list_responses()
    {
        PlacementRequestResponse::factory()->count(3)->create([
            'placement_request_id' => $this->placementRequest->id,
        ]);

        $this->actingAs($this->owner);

        $response = $this->getJson("/api/placement-requests/{$this->placementRequest->id}/responses");

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_helper_cannot_list_all_responses()
    {
        $this->actingAs($this->helper);

        $response = $this->getJson("/api/placement-requests/{$this->placementRequest->id}/responses");

        $response->assertStatus(403);
    }

    public function test_owner_can_accept_response()
    {
        // Update the placement request to have a non-pet-sitting type
        $this->placementRequest->update(['request_type' => \App\Enums\PlacementRequestType::PERMANENT]);

        $placementResponse = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $this->placementRequest->id,
            'helper_profile_id' => $this->helperProfile->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);

        $this->actingAs($this->owner);

        $response = $this->postJson("/api/placement-responses/{$placementResponse->id}/accept");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'accepted');

        $this->assertDatabaseHas('placement_request_responses', [
            'id' => $placementResponse->id,
            'status' => 'accepted',
        ]);

        // For non-pet-sitting types, placement request goes to PENDING_TRANSFER
        $this->assertDatabaseHas('placement_requests', [
            'id' => $this->placementRequest->id,
            'status' => \App\Enums\PlacementRequestStatus::PENDING_TRANSFER->value,
        ]);

        // And a PENDING transfer request is created
        $this->assertDatabaseHas('transfer_requests', [
            'placement_request_id' => $this->placementRequest->id,
            'from_user_id' => $this->owner->id,
            'to_user_id' => $placementResponse->helperProfile->user_id,
            'status' => \App\Enums\TransferRequestStatus::PENDING->value,
        ]);
    }

    public function test_owner_can_reject_response()
    {
        $placementResponse = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $this->placementRequest->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);

        $this->actingAs($this->owner);

        $response = $this->postJson("/api/placement-responses/{$placementResponse->id}/reject");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'rejected');

        $this->assertDatabaseHas('placement_request_responses', [
            'id' => $placementResponse->id,
            'status' => 'rejected',
        ]);
    }

    public function test_owner_can_accept_pet_sitting_response()
    {
        // Update the placement request to have pet-sitting type
        $this->placementRequest->update(['request_type' => \App\Enums\PlacementRequestType::PET_SITTING]);

        $placementResponse = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $this->placementRequest->id,
            'helper_profile_id' => $this->helperProfile->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);

        // Create another response to verify auto-rejection
        $otherResponse = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $this->placementRequest->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);

        $this->actingAs($this->owner);

        $response = $this->postJson("/api/placement-responses/{$placementResponse->id}/accept");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'accepted');

        $this->assertDatabaseHas('placement_request_responses', [
            'id' => $placementResponse->id,
            'status' => 'accepted',
        ]);

        // Verify other response is auto-rejected
        $this->assertDatabaseHas('placement_request_responses', [
            'id' => $otherResponse->id,
            'status' => 'rejected',
        ]);

        // For pet-sitting, placement request goes to ACTIVE immediately
        $this->assertDatabaseHas('placement_requests', [
            'id' => $this->placementRequest->id,
            'status' => \App\Enums\PlacementRequestStatus::ACTIVE->value,
        ]);

        // And a SITTER relationship is created
        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $this->pet->id,
            'user_id' => $this->helper->id,
            'relationship_type' => \App\Enums\PetRelationshipType::SITTER->value,
            'end_at' => null,
        ]);

        // No transfer request is created
        $this->assertDatabaseMissing('transfer_requests', [
            'placement_request_id' => $this->placementRequest->id,
        ]);
    }

    public function test_helper_can_cancel_response()
    {
        $placementResponse = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $this->placementRequest->id,
            'helper_profile_id' => $this->helperProfile->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);

        $this->actingAs($this->helper);

        $response = $this->postJson("/api/placement-responses/{$placementResponse->id}/cancel");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertDatabaseHas('placement_request_responses', [
            'id' => $placementResponse->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_helper_cannot_respond_twice_if_active()
    {
        PlacementRequestResponse::factory()->create([
            'placement_request_id' => $this->placementRequest->id,
            'helper_profile_id' => $this->helperProfile->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);

        $this->actingAs($this->helper);

        $response = $this->postJson("/api/placement-requests/{$this->placementRequest->id}/responses", [
            'message' => 'Second response',
        ]);

        $response->assertStatus(403);
    }

    public function test_helper_can_respond_again_if_cancelled()
    {
        PlacementRequestResponse::factory()->create([
            'placement_request_id' => $this->placementRequest->id,
            'helper_profile_id' => $this->helperProfile->id,
            'status' => PlacementResponseStatus::CANCELLED,
        ]);

        $this->actingAs($this->helper);

        $response = $this->postJson("/api/placement-requests/{$this->placementRequest->id}/responses", [
            'message' => 'Trying again',
        ]);

        $response->assertStatus(201);
    }

    public function test_helper_cannot_respond_again_if_rejected()
    {
        PlacementRequestResponse::factory()->create([
            'placement_request_id' => $this->placementRequest->id,
            'helper_profile_id' => $this->helperProfile->id,
            'status' => PlacementResponseStatus::REJECTED,
        ]);

        $this->actingAs($this->helper);

        $response = $this->postJson("/api/placement-requests/{$this->placementRequest->id}/responses", [
            'message' => 'Trying again after rejection',
        ]);

        $response->assertStatus(403);
    }
}
