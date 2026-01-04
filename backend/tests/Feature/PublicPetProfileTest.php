<?php

namespace Tests\Feature;

use App\Enums\PetRelationshipType;
use App\Enums\PlacementRequestStatus;
use App\Enums\TransferRequestStatus;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PublicPetProfileTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_guest_can_view_lost_pet_via_view_endpoint(): void
    {
        $pet = Pet::factory()->create(['status' => 'lost', 'name' => 'Lost Pet']);

        $response = $this->getJson("/api/pets/{$pet->id}/view");

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Lost Pet')
            ->assertJsonPath('data.status', 'lost');
    }

    #[Test]
    public function test_guest_can_view_pet_with_active_placement_request_via_view_endpoint(): void
    {
        $pet = Pet::factory()->create(['name' => 'Available Pet']);
        PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'status' => PlacementRequestStatus::OPEN,
        ]);

        $response = $this->getJson("/api/pets/{$pet->id}/view");

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Available Pet');
    }

    #[Test]
    public function test_guest_cannot_view_private_pet_via_view_endpoint(): void
    {
        $pet = Pet::factory()->create(['name' => 'Private Pet']);

        $response = $this->getJson("/api/pets/{$pet->id}/view");

        $response->assertStatus(403)
            ->assertJson(['error' => 'This pet profile is not publicly available.']);
    }

    #[Test]
    public function test_authenticated_user_cannot_view_private_pet_via_view_endpoint(): void
    {
        $user = User::factory()->create();
        $pet = Pet::factory()->create(['name' => 'Private Pet']);
        Sanctum::actingAs($user);

        $response = $this->getJson("/api/pets/{$pet->id}/view");

        $response->assertStatus(403)
            ->assertJson(['error' => 'This pet profile is not publicly available.']);
    }

    #[Test]
    public function test_view_endpoint_returns_only_whitelisted_fields(): void
    {
        $pet = Pet::factory()->create(['status' => 'lost']);

        $response = $this->getJson("/api/pets/{$pet->id}/view");

        $response->assertStatus(200);
        $data = $response->json('data');

        // Assert whitelisted fields are present
        $this->assertArrayHasKey('id', $data);
        $this->assertArrayHasKey('name', $data);
        $this->assertArrayHasKey('sex', $data);
        $this->assertArrayHasKey('country', $data);
        $this->assertArrayHasKey('description', $data);
        $this->assertArrayHasKey('status', $data);
        $this->assertArrayHasKey('pet_type_id', $data);
        $this->assertArrayHasKey('pet_type', $data);
        $this->assertArrayHasKey('categories', $data);
        $this->assertArrayHasKey('placement_requests', $data);
        $this->assertArrayHasKey('viewer_permissions', $data);

        // Assert sensitive fields are NOT present
        $this->assertArrayNotHasKey('user_id', $data);
        $this->assertArrayNotHasKey('user', $data);
        $this->assertArrayNotHasKey('address', $data);
    }

    #[Test]
    public function test_owner_sees_is_owner_flag_on_view_endpoint(): void
    {
        $owner = User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => 'lost']);
        Sanctum::actingAs($owner);

        $response = $this->getJson("/api/pets/{$pet->id}/view");

        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.is_owner', true);
    }

    #[Test]
    public function test_non_owner_sees_is_owner_flag_as_false_on_view_endpoint(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => 'lost']);
        Sanctum::actingAs($viewer);

        $response = $this->getJson("/api/pets/{$pet->id}/view");

        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.is_owner', false);
    }

    #[Test]
    public function test_guest_sees_is_owner_flag_as_false_on_view_endpoint(): void
    {
        $pet = Pet::factory()->create(['status' => 'lost']);

        $response = $this->getJson("/api/pets/{$pet->id}/view");

        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.is_owner', false);
    }

    #[Test]
    public function test_view_endpoint_includes_placement_requests_with_transfer_requests(): void
    {
        $pet = Pet::factory()->create();
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'status' => PlacementRequestStatus::OPEN,
            'request_type' => 'permanent',
        ]);

        $response = $this->getJson("/api/pets/{$pet->id}/view");

        $response->assertStatus(200)
            ->assertJsonPath('data.placement_requests.0.id', $placementRequest->id)
            ->assertJsonPath('data.placement_requests.0.request_type', 'permanent');
    }

    #[Test]
    public function test_view_endpoint_returns_404_for_nonexistent_pet(): void
    {
        $response = $this->getJson('/api/pets/99999/view');

        $response->assertStatus(404);
    }

    #[Test]
    public function test_pet_with_fulfilled_placement_request_is_not_publicly_viewable(): void
    {
        $pet = Pet::factory()->create();
        PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'status' => PlacementRequestStatus::FULFILLED,
        ]);

        $response = $this->getJson("/api/pets/{$pet->id}/view");

        $response->assertStatus(403);
    }

    #[Test]
    public function test_lost_pet_is_viewable_even_without_placement_request(): void
    {
        $pet = Pet::factory()->create(['status' => 'lost']);
        // No placement request created

        $response = $this->getJson("/api/pets/{$pet->id}/view");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'lost');
    }

    #[Test]
    public function test_owner_can_always_view_pet_via_view_endpoint(): void
    {
        $owner = User::factory()->create();
        // Pet is not lost and has no placement requests
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => 'active']);
        Sanctum::actingAs($owner);

        $response = $this->getJson("/api/pets/{$pet->id}/view");

        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.is_owner', true);
    }

    #[Test]
    public function test_user_with_viewer_relationship_can_view_pet(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => 'active']);

        // Create viewer relationship
        PetRelationship::create([
            'user_id' => $viewer->id,
            'pet_id' => $pet->id,
            'relationship_type' => PetRelationshipType::VIEWER,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs($viewer);

        $response = $this->getJson("/api/pets/{$pet->id}/view");

        $response->assertStatus(200)
            ->assertJsonPath('data.name', $pet->name);
    }

    #[Test]
    public function test_helper_involved_in_pending_transfer_can_view_pet(): void
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => 'active']);

        // Create placement request in pending_transfer status
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::PENDING_TRANSFER,
        ]);

        // Create placement request response
        $response = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
        ]);

        // Create transfer request with the helper as recipient
        TransferRequest::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'placement_request_response_id' => $response->id,
            'from_user_id' => $owner->id,
            'to_user_id' => $helper->id,
            'status' => TransferRequestStatus::PENDING,
        ]);

        Sanctum::actingAs($helper);

        $apiResponse = $this->getJson("/api/pets/{$pet->id}/view");

        $apiResponse->assertStatus(200)
            ->assertJsonPath('data.name', $pet->name);
    }

    #[Test]
    public function test_helper_with_confirmed_transfer_cannot_view_private_pet(): void
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => 'active']);

        // Create placement request in pending_transfer status
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::PENDING_TRANSFER,
        ]);

        // Create placement request response
        $response = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
        ]);

        // Create transfer request with CONFIRMED status (not pending)
        TransferRequest::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'placement_request_response_id' => $response->id,
            'from_user_id' => $owner->id,
            'to_user_id' => $helper->id,
            'status' => TransferRequestStatus::CONFIRMED,
        ]);

        Sanctum::actingAs($helper);

        $apiResponse = $this->getJson("/api/pets/{$pet->id}/view");

        // Helper should not have access since transfer is confirmed, not pending
        $apiResponse->assertStatus(403);
    }

    #[Test]
    public function test_random_user_cannot_view_pet_in_pending_transfer(): void
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();
        $randomUser = User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => 'active']);

        // Create placement request in pending_transfer status
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::PENDING_TRANSFER,
        ]);

        // Create placement request response
        $response = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
        ]);

        // Create transfer request with the helper as recipient
        TransferRequest::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'placement_request_response_id' => $response->id,
            'from_user_id' => $owner->id,
            'to_user_id' => $helper->id,
            'status' => TransferRequestStatus::PENDING,
        ]);

        Sanctum::actingAs($randomUser);

        $apiResponse = $this->getJson("/api/pets/{$pet->id}/view");

        // Random user should not have access
        $apiResponse->assertStatus(403);
    }
}
