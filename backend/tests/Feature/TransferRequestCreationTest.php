<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TransferRequestCreationTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_helper_can_respond_to_placement_request(): void
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();
        $helperProfile = \App\Models\HelperProfile::factory()->create(['user_id' => $helper->id]);
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => \App\Enums\PetStatus::ACTIVE]);
        $placementRequest = PlacementRequest::factory()->create(['pet_id' => $pet->id, 'status' => \App\Enums\PlacementRequestStatus::OPEN]);

        Sanctum::actingAs($helper);

        $this->assertTrue($helper->helperProfiles()->exists());

        $response = $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [
            'message' => 'I want to help!',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('placement_request_responses', [
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
        ]);
    }

    #[Test]
    public function test_user_without_helper_profile_cannot_respond_to_placement_request(): void
    {
        $owner = User::factory()->create();
        $user = User::factory()->create(); // No helper profile
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => \App\Enums\PetStatus::ACTIVE]);
        $placementRequest = PlacementRequest::factory()->create(['pet_id' => $pet->id, 'status' => \App\Enums\PlacementRequestStatus::OPEN]);

        Sanctum::actingAs($user);

        $this->assertFalse($user->helperProfiles()->exists());

        $response = $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [
            'message' => 'I want to help!',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function test_owner_cannot_respond_to_own_placement_request(): void
    {
        $owner = User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => \App\Enums\PetStatus::ACTIVE]);
        $placementRequest = PlacementRequest::factory()->create(['pet_id' => $pet->id, 'status' => \App\Enums\PlacementRequestStatus::OPEN]);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [
            'message' => 'I want to help!',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function test_accepting_response_for_permanent_creates_pending_transfer(): void
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();
        $helperProfile = \App\Models\HelperProfile::factory()->create(['user_id' => $helper->id]);
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => \App\Enums\PetStatus::ACTIVE]);
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => \App\Enums\PlacementRequestStatus::OPEN,
            'request_type' => \App\Enums\PlacementRequestType::PERMANENT,
        ]);
        $placementResponse = \App\Models\PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => \App\Enums\PlacementResponseStatus::RESPONDED,
        ]);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/placement-responses/{$placementResponse->id}/accept");

        $response->assertStatus(200);
        // After accepting, placement request is pending_transfer (not fulfilled yet)
        $this->assertDatabaseHas('placement_requests', [
            'id' => $placementRequest->id,
            'status' => \App\Enums\PlacementRequestStatus::PENDING_TRANSFER->value,
        ]);

        // And a transfer request is created with PENDING status
        $this->assertDatabaseHas('transfer_requests', [
            'placement_request_id' => $placementRequest->id,
            'from_user_id' => $owner->id,
            'to_user_id' => $helper->id,
            'status' => \App\Enums\TransferRequestStatus::PENDING->value,
        ]);
    }

    #[Test]
    public function test_accepting_response_for_pet_sitting_goes_directly_to_active(): void
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();
        $helperProfile = \App\Models\HelperProfile::factory()->create(['user_id' => $helper->id]);
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => \App\Enums\PetStatus::ACTIVE]);
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => \App\Enums\PlacementRequestStatus::OPEN,
            'request_type' => \App\Enums\PlacementRequestType::PET_SITTING,
        ]);
        $placementResponse = \App\Models\PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => \App\Enums\PlacementResponseStatus::RESPONDED,
        ]);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/placement-responses/{$placementResponse->id}/accept");

        $response->assertStatus(200);
        // For pet_sitting, placement request goes directly to active
        $this->assertDatabaseHas('placement_requests', [
            'id' => $placementRequest->id,
            'status' => \App\Enums\PlacementRequestStatus::ACTIVE->value,
        ]);

        // No transfer request is created for pet_sitting
        $this->assertDatabaseMissing('transfer_requests', [
            'placement_request_id' => $placementRequest->id,
        ]);
    }
}
