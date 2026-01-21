<?php

namespace Tests\Feature;

use App\Enums\PetRelationshipType;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\TransferRequestStatus;
use App\Models\HelperProfile;
use App\Models\PetRelationship;
use App\Models\PlacementRequest;
use App\Models\TransferRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class FinalizePlacementRequestTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function owner_can_finalize_active_foster_placement(): void
    {
        $now = Carbon::parse('2026-01-03 12:00:00');
        Carbon::setTestNow($now);

        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::ACTIVE,
            'request_type' => PlacementRequestType::FOSTER_FREE,
        ]);

        // Create a confirmed transfer request to simulate the handover that happened earlier
        $transferRequest = TransferRequest::create([
            'placement_request_id' => $placementRequest->id,
            'from_user_id' => $owner->id,
            'to_user_id' => $helper->id,
            'status' => TransferRequestStatus::CONFIRMED,
            'confirmed_at' => $now->subHour(),
        ]);

        // Create the active foster relationship
        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $helper->id,
            'relationship_type' => PetRelationshipType::FOSTER,
            'start_at' => $now->subHour(),
            'created_by' => $owner->id,
        ]);

        Carbon::setTestNow($now); // Reset to current test time

        Sanctum::actingAs($owner);
        $this->postJson("/api/placement-requests/{$placementRequest->id}/finalize")
            ->assertStatus(200);

        $this->assertDatabaseHas('placement_requests', [
            'id' => $placementRequest->id,
            'status' => PlacementRequestStatus::FINALIZED->value,
        ]);

        // Foster relationship should be ended
        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $helper->id,
            'relationship_type' => PetRelationshipType::FOSTER->value,
            'end_at' => $now->format('Y-m-d H:i:s'),
        ]);

        // Owner relationship should still be active
        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'relationship_type' => PetRelationshipType::OWNER->value,
            'end_at' => null,
        ]);
    }

    #[Test]
    public function cannot_finalize_permanent_placement_this_way(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::ACTIVE,
            'request_type' => PlacementRequestType::PERMANENT,
        ]);

        Sanctum::actingAs($owner);
        $this->postJson("/api/placement-requests/{$placementRequest->id}/finalize")
            ->assertStatus(409);
    }

    #[Test]
    public function owner_can_finalize_active_pet_sitting_placement(): void
    {
        $now = Carbon::parse('2026-01-03 12:00:00');
        Carbon::setTestNow($now);

        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::ACTIVE,
            'request_type' => PlacementRequestType::PET_SITTING,
        ]);

        // Create the accepted response
        $placementResponse = \App\Models\PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => \App\Enums\PlacementResponseStatus::ACCEPTED,
            'accepted_at' => $now->subHour(),
        ]);

        // Create the active sitter relationship
        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $helper->id,
            'relationship_type' => PetRelationshipType::SITTER,
            'start_at' => $now->subHour(),
            'created_by' => $owner->id,
        ]);

        Carbon::setTestNow($now); // Reset to current test time

        Sanctum::actingAs($owner);
        $this->postJson("/api/placement-requests/{$placementRequest->id}/finalize")
            ->assertStatus(200);

        $this->assertDatabaseHas('placement_requests', [
            'id' => $placementRequest->id,
            'status' => PlacementRequestStatus::FINALIZED->value,
        ]);

        // Sitter relationship should be ended
        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $helper->id,
            'relationship_type' => PetRelationshipType::SITTER->value,
            'end_at' => $now->format('Y-m-d H:i:s'),
        ]);
    }
}
