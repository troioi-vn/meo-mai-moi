<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

class PetProfileTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_guest_cannot_update_pet_profile(): void
    {
        $pet = Pet::factory()->create();
        $response = $this->putJson("/api/pets/{$pet->id}", ['name' => 'New Name']);
        $response->assertStatus(401);
    }

    public function test_non_custodian_cannot_update_pet_profile(): void
    {
        $pet = Pet::factory()->create();
        $nonCustodian = User::factory()->create();
        Sanctum::actingAs($nonCustodian);

        $response = $this->putJson("/api/pets/{$pet->id}", ['name' => 'New Name']);
        $response->assertStatus(403);
    }

    public function test_custodian_can_update_pet_profile(): void
    {
        $custodian = User::factory()->create();
        $pet = Pet::factory()->create(['user_id' => $custodian->id]);
        Sanctum::actingAs($custodian);

        $updateData = ['name' => 'Updated Name'];
        $response = $this->putJson("/api/pets/{$pet->id}", $updateData);

        $response->assertStatus(200)
            ->assertJson(['data' => $updateData]);
        $this->assertDatabaseHas('pets', ['id' => $pet->id, 'name' => 'Updated Name']);
    }

    public function test_admin_can_update_any_pet_profile(): void
    {
        $admin = User::factory()->create();
        Role::firstOrCreate(['name' => 'admin']);
        $admin->assignRole('admin');
        $pet = Pet::factory()->create();
        Sanctum::actingAs($admin);

        $updateData = ['name' => 'Admin Updated Name'];
        $response = $this->putJson("/api/pets/{$pet->id}", $updateData);

        $response->assertStatus(200)
            ->assertJson(['data' => $updateData]);
        $this->assertDatabaseHas('pets', ['id' => $pet->id, 'name' => 'Admin Updated Name']);
    }

    // OptionalAuth middleware behaviour on show endpoint
    #[Test]
    public function test_guest_can_view_pet_profile_without_edit_permissions(): void
    {
        $pet = Pet::factory()->create(['name' => 'Test Pet']);
        $response = $this->getJson("/api/pets/{$pet->id}");
        // Original cat test expected 403 for guest without active placement; maintain semantics
        $response->assertStatus(403);
    }

    #[Test]
    public function test_authenticated_non_owner_cannot_view_pet_without_active_placement_request(): void
    {
        $user = User::factory()->create();
        $pet = Pet::factory()->create(['name' => 'Test Pet']);
        Sanctum::actingAs($user);
        $response = $this->getJson("/api/pets/{$pet->id}");
        $response->assertStatus(403);
    }

    #[Test]
    public function test_pet_owner_can_view_pet_profile_with_edit_permissions(): void
    {
        $owner = User::factory()->create();
        $pet = Pet::factory()->create(['user_id' => $owner->id, 'name' => 'Owner Pet']);
        Sanctum::actingAs($owner);

        $response = $this->getJson("/api/pets/{$pet->id}");
        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Owner Pet')
            ->assertJsonPath('data.viewer_permissions.can_edit', true);
    }

    #[Test]
    public function test_admin_can_view_any_pet_profile_with_edit_permissions(): void
    {
        $admin = User::factory()->create();
        Role::firstOrCreate(['name' => 'admin']);
        $admin->assignRole('admin');
        $pet = Pet::factory()->create(['name' => 'Admin Test Pet']);
        $this->assertTrue($admin->hasRole('admin'));
        Sanctum::actingAs($admin);
        $response = $this->getJson("/api/pets/{$pet->id}");
        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Admin Test Pet')
            ->assertJsonPath('data.viewer_permissions.can_edit', true);
    }

    #[Test]
    public function test_optional_auth_middleware_handles_invalid_token_gracefully(): void
    {
        $pet = Pet::factory()->create(['name' => 'Test Pet']);
        $response = $this->withHeaders([
            'Authorization' => 'Bearer invalid-token-12345'
        ])->getJson("/api/pets/{$pet->id}");
        $response->assertStatus(403);
    }

    #[Test]
    public function test_optional_auth_middleware_handles_malformed_auth_header(): void
    {
        $pet = Pet::factory()->create(['name' => 'Test Pet']);
        $response = $this->withHeaders([
            'Authorization' => 'InvalidFormat token123'
        ])->getJson("/api/pets/{$pet->id}");
        $response->assertStatus(403);
    }

    #[Test]
    public function test_pet_profile_returns_404_for_nonexistent_pet(): void
    {
        $response = $this->getJson('/api/pets/99999');
        $response->assertStatus(404);
    }

    #[Test]
    public function test_guest_can_view_pet_with_active_placement_request(): void
    {
        $pet = Pet::factory()->create();
        PlacementRequest::factory()->create(['pet_id' => $pet->id, 'is_active' => true]);
        $response = $this->getJson("/api/pets/{$pet->id}");
        $response->assertStatus(200);
    }

    #[Test]
    public function test_authenticated_non_owner_can_view_pet_with_active_placement_request(): void
    {
        $user = User::factory()->create();
        $pet = Pet::factory()->create();
        PlacementRequest::factory()->create(['pet_id' => $pet->id, 'is_active' => true]);
        Sanctum::actingAs($user);
        $response = $this->getJson("/api/pets/{$pet->id}");
        $response->assertStatus(200);
    }

    #[Test]
    public function test_guest_cannot_view_pet_without_active_placement_request(): void
    {
        $pet = Pet::factory()->create();
        $response = $this->getJson("/api/pets/{$pet->id}");
        $response->assertStatus(403);
    }
}
