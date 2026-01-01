<?php

namespace Tests\Feature;

use App\Enums\PlacementRequestStatus;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PublicPetProfileTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_guest_can_view_lost_pet_via_public_endpoint(): void
    {
        $pet = Pet::factory()->create(['status' => 'lost', 'name' => 'Lost Pet']);

        $response = $this->getJson("/api/pets/{$pet->id}/public");

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Lost Pet')
            ->assertJsonPath('data.status', 'lost');
    }

    #[Test]
    public function test_guest_can_view_pet_with_active_placement_request_via_public_endpoint(): void
    {
        $pet = Pet::factory()->create(['name' => 'Available Pet']);
        PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'status' => PlacementRequestStatus::OPEN,
        ]);

        $response = $this->getJson("/api/pets/{$pet->id}/public");

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Available Pet');
    }

    #[Test]
    public function test_guest_cannot_view_private_pet_via_public_endpoint(): void
    {
        $pet = Pet::factory()->create(['name' => 'Private Pet']);

        $response = $this->getJson("/api/pets/{$pet->id}/public");

        $response->assertStatus(403)
            ->assertJson(['error' => 'This pet profile is not publicly available.']);
    }

    #[Test]
    public function test_authenticated_user_cannot_view_private_pet_via_public_endpoint(): void
    {
        $user = User::factory()->create();
        $pet = Pet::factory()->create(['name' => 'Private Pet']);
        Sanctum::actingAs($user);

        $response = $this->getJson("/api/pets/{$pet->id}/public");

        $response->assertStatus(403)
            ->assertJson(['error' => 'This pet profile is not publicly available.']);
    }

    #[Test]
    public function test_public_endpoint_returns_only_whitelisted_fields(): void
    {
        $pet = Pet::factory()->create(['status' => 'lost']);

        $response = $this->getJson("/api/pets/{$pet->id}/public");

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
    public function test_owner_sees_is_owner_flag_on_public_endpoint(): void
    {
        $owner = User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => 'lost']);
        Sanctum::actingAs($owner);

        $response = $this->getJson("/api/pets/{$pet->id}/public");

        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.is_owner', true);
    }

    #[Test]
    public function test_non_owner_sees_is_owner_flag_as_false_on_public_endpoint(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => 'lost']);
        Sanctum::actingAs($viewer);

        $response = $this->getJson("/api/pets/{$pet->id}/public");

        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.is_owner', false);
    }

    #[Test]
    public function test_guest_sees_is_owner_flag_as_false_on_public_endpoint(): void
    {
        $pet = Pet::factory()->create(['status' => 'lost']);

        $response = $this->getJson("/api/pets/{$pet->id}/public");

        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.is_owner', false);
    }

    #[Test]
    public function test_public_endpoint_includes_placement_requests_with_transfer_requests(): void
    {
        $pet = Pet::factory()->create();
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'status' => PlacementRequestStatus::OPEN,
            'request_type' => 'permanent',
        ]);

        $response = $this->getJson("/api/pets/{$pet->id}/public");

        $response->assertStatus(200)
            ->assertJsonPath('data.placement_requests.0.id', $placementRequest->id)
            ->assertJsonPath('data.placement_requests.0.request_type', 'permanent');
    }

    #[Test]
    public function test_public_endpoint_returns_404_for_nonexistent_pet(): void
    {
        $response = $this->getJson('/api/pets/99999/public');

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

        $response = $this->getJson("/api/pets/{$pet->id}/public");

        $response->assertStatus(403);
    }

    #[Test]
    public function test_lost_pet_is_viewable_even_without_placement_request(): void
    {
        $pet = Pet::factory()->create(['status' => 'lost']);
        // No placement request created

        $response = $this->getJson("/api/pets/{$pet->id}/public");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'lost');
    }
}
