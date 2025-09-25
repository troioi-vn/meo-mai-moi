<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\TransferRequest;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

class TransferRequestCreationTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_helper_can_create_transfer_request_for_placement_request(): void
    {
    $owner = User::factory()->create();
    $helper = User::factory()->create();
    $helperProfile = \App\Models\HelperProfile::factory()->create(['user_id' => $helper->id]);
    $pet = Pet::factory()->create(['user_id' => $owner->id, 'status' => \App\Enums\PetStatus::ACTIVE]);
    $placementRequest = PlacementRequest::factory()->create(['pet_id' => $pet->id, 'is_active' => true, 'status' => \App\Enums\PlacementRequestStatus::OPEN->value]);

        Sanctum::actingAs($helper);

        $this->assertTrue($helper->helperProfiles()->exists());

        $this->assertTrue($helper->helperProfiles()->exists());

        $response = $this->postJson('/api/transfer-requests', [
            'pet_id' => $pet->id,
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'requested_relationship_type' => 'fostering',
            'fostering_type' => 'free',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('transfer_requests', [
            'placement_request_id' => $placementRequest->id,
        ]);
    }

    #[Test]
    public function test_user_without_helper_profile_cannot_create_transfer_request(): void
    {
    $owner = User::factory()->create();
    $user = User::factory()->create(); // No helper profile
    $pet = Pet::factory()->create(['user_id' => $owner->id, 'status' => \App\Enums\PetStatus::ACTIVE]);
    $placementRequest = PlacementRequest::factory()->create(['pet_id' => $pet->id, 'is_active' => true, 'status' => \App\Enums\PlacementRequestStatus::OPEN->value]);

        Sanctum::actingAs($user);

        $this->assertFalse($user->helperProfiles()->exists());

        $response = $this->postJson('/api/transfer-requests', [
            'pet_id' => $pet->id,
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => 999, // Non-existent helper profile
            'requested_relationship_type' => 'fostering',
            'fostering_type' => 'free',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function test_owner_cannot_create_transfer_request_for_own_cat(): void
    {
    $owner = User::factory()->create();
    $pet = Pet::factory()->create(['user_id' => $owner->id, 'status' => \App\Enums\PetStatus::ACTIVE]);
    $placementRequest = PlacementRequest::factory()->create(['pet_id' => $pet->id, 'is_active' => true, 'status' => \App\Enums\PlacementRequestStatus::OPEN->value]);

        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/transfer-requests', [
            'pet_id' => $pet->id,
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => 999, // Non-existent helper profile
            'requested_relationship_type' => 'fostering',
            'fostering_type' => 'free',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function test_accepting_transfer_request_deactivates_placement_request(): void
    {
    $owner = User::factory()->create();
    $helper = User::factory()->create();
    $pet = Pet::factory()->create(['user_id' => $owner->id, 'status' => \App\Enums\PetStatus::ACTIVE]);
    $placementRequest = PlacementRequest::factory()->create(['pet_id' => $pet->id, 'is_active' => true, 'status' => \App\Enums\PlacementRequestStatus::OPEN->value]);
        $transferRequest = TransferRequest::factory()->create([
            'pet_id' => $pet->id,
            'initiator_user_id' => $helper->id,
            'recipient_user_id' => $owner->id,
            'placement_request_id' => $placementRequest->id,
            'status' => 'pending',
        ])->load('placementRequest');

        $this->be($owner);

        $response = $this->postJson("/api/transfer-requests/{$transferRequest->id}/accept");

        $response->assertStatus(200);
        $this->assertDatabaseHas('placement_requests', [
            'id' => $placementRequest->id,
            'is_active' => false,
        ]);
    }
}
