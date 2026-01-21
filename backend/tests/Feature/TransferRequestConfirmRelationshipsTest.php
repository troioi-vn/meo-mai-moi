<?php

namespace Tests\Feature;

use App\Enums\PetRelationshipType;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\PlacementResponseStatus;
use App\Enums\TransferRequestStatus;
use App\Models\HelperProfile;
use App\Models\PetRelationship;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\TransferRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TransferRequestConfirmRelationshipsTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function confirming_permanent_transfer_updates_relationships_and_is_idempotent(): void
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
            'status' => PlacementRequestStatus::OPEN,
            'request_type' => PlacementRequestType::PERMANENT,
        ]);

        $placementResponse = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);

        // Owner accepts helper response -> creates pending transfer
        Sanctum::actingAs($owner);
        $this->postJson("/api/placement-responses/{$placementResponse->id}/accept")
            ->assertStatus(200);

        $transferRequest = TransferRequest::where('placement_request_id', $placementRequest->id)->firstOrFail();

        // Helper confirms physical handover
        Sanctum::actingAs($helper);
        $this->postJson("/api/transfer-requests/{$transferRequest->id}/confirm")
            ->assertStatus(200);

        $this->assertDatabaseHas('transfer_requests', [
            'id' => $transferRequest->id,
            'status' => TransferRequestStatus::CONFIRMED->value,
        ]);

        $this->assertDatabaseHas('placement_requests', [
            'id' => $placementRequest->id,
            'status' => PlacementRequestStatus::FINALIZED->value,
        ]);

        // New owner relationship for helper
        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $helper->id,
            'relationship_type' => PetRelationshipType::OWNER->value,
            'end_at' => null,
        ]);

        // Old owner relationship ended
        $this->assertTrue(
            PetRelationship::where('pet_id', $pet->id)
                ->where('user_id', $owner->id)
                ->where('relationship_type', PetRelationshipType::OWNER)
                ->whereNotNull('end_at')
                ->exists()
        );

        // Former owner keeps viewer access
        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'relationship_type' => PetRelationshipType::VIEWER->value,
            'end_at' => null,
        ]);

        // Idempotency: confirming again does not create duplicates
        $this->postJson("/api/transfer-requests/{$transferRequest->id}/confirm")
            ->assertStatus(200);

        $this->assertSame(1, PetRelationship::where('pet_id', $pet->id)
            ->where('user_id', $helper->id)
            ->where('relationship_type', PetRelationshipType::OWNER)
            ->whereNull('end_at')
            ->count());

        $this->assertSame(1, PetRelationship::where('pet_id', $pet->id)
            ->where('user_id', $owner->id)
            ->where('relationship_type', PetRelationshipType::VIEWER)
            ->whereNull('end_at')
            ->count());
    }

    #[Test]
    public function confirming_foster_transfer_creates_foster_relationship_and_is_idempotent(): void
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
            'status' => PlacementRequestStatus::OPEN,
            'request_type' => PlacementRequestType::FOSTER_FREE,
        ]);

        $placementResponse = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);

        // Owner accepts helper response -> creates pending transfer
        Sanctum::actingAs($owner);
        $this->postJson("/api/placement-responses/{$placementResponse->id}/accept")
            ->assertStatus(200);

        $transferRequest = TransferRequest::where('placement_request_id', $placementRequest->id)->firstOrFail();

        // Helper confirms physical handover
        Sanctum::actingAs($helper);
        $this->postJson("/api/transfer-requests/{$transferRequest->id}/confirm")
            ->assertStatus(200);

        $this->assertDatabaseHas('transfer_requests', [
            'id' => $transferRequest->id,
            'status' => TransferRequestStatus::CONFIRMED->value,
        ]);

        $this->assertDatabaseHas('placement_requests', [
            'id' => $placementRequest->id,
            'status' => PlacementRequestStatus::ACTIVE->value,
        ]);

        // Foster relationship starts at confirm-time (now)
        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $helper->id,
            'relationship_type' => PetRelationshipType::FOSTER->value,
            'end_at' => null,
            'start_at' => $now->format('Y-m-d H:i:s'),
        ]);

        // Idempotency: confirming again does not create duplicates
        $this->postJson("/api/transfer-requests/{$transferRequest->id}/confirm")
            ->assertStatus(200);

        $this->assertSame(1, PetRelationship::where('pet_id', $pet->id)
            ->where('user_id', $helper->id)
            ->where('relationship_type', PetRelationshipType::FOSTER)
            ->whereNull('end_at')
            ->count());
    }
}
