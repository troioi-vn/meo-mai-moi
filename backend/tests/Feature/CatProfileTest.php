<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

class CatProfileTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_guest_cannot_update_cat_profile(): void
    {
        $cat = Cat::factory()->create();
        $response = $this->putJson("/api/cats/{$cat->id}", ['name' => 'New Name']);
        $response->assertStatus(401);
    }

    public function test_non_custodian_cannot_update_cat_profile(): void
    {
        $cat = Cat::factory()->create();
        $nonCustodian = User::factory()->create();
        Sanctum::actingAs($nonCustodian);

        $response = $this->putJson("/api/cats/{$cat->id}", ['name' => 'New Name']);
        $response->assertStatus(403);
    }

    public function test_custodian_can_update_cat_profile(): void
    {
        $custodian = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $custodian->id]);
        Sanctum::actingAs($custodian);

        $updateData = ['name' => 'Updated Name'];
        $response = $this->putJson("/api/cats/{$cat->id}", $updateData);

        $response->assertStatus(200)
            ->assertJsonFragment($updateData);
        $this->assertDatabaseHas('cats', ['id' => $cat->id, 'name' => 'Updated Name']);
    }

    public function test_admin_can_update_any_cat_profile(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN->value]);
        $cat = Cat::factory()->create();
        Sanctum::actingAs($admin);

        $updateData = ['name' => 'Admin Updated Name'];
        $response = $this->putJson("/api/cats/{$cat->id}", $updateData);

        $response->assertStatus(200)
            ->assertJsonFragment($updateData);
        $this->assertDatabaseHas('cats', ['id' => $cat->id, 'name' => 'Admin Updated Name']);
    }

    // Tests for OptionalAuth middleware on show endpoint
    #[Test]
    public function test_guest_can_view_cat_profile_without_edit_permissions(): void
    {
        $cat = Cat::factory()->create(['name' => 'Test Cat']);
        
        $response = $this->getJson("/api/cats/{$cat->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Test Cat'])
            ->assertJsonPath('data.viewer_permissions.can_edit', false);
    }

    #[Test]
    public function test_authenticated_non_owner_can_view_cat_without_edit_permissions(): void
    {
        $user = User::factory()->create();
        $cat = Cat::factory()->create(['name' => 'Test Cat']);
        Sanctum::actingAs($user);
        
        $response = $this->getJson("/api/cats/{$cat->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Test Cat'])
            ->assertJsonPath('data.viewer_permissions.can_edit', false);
    }

    #[Test]
    public function test_cat_owner_can_view_cat_profile_with_edit_permissions(): void
    {
        $owner = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $owner->id, 'name' => 'Owner Cat']);
        Sanctum::actingAs($owner);
        
        $response = $this->getJson("/api/cats/{$cat->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Owner Cat'])
            ->assertJsonPath('data.viewer_permissions.can_edit', true);
    }

    #[Test]
    public function test_admin_can_view_any_cat_profile_with_edit_permissions(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN->value]);
        $cat = Cat::factory()->create(['name' => 'Admin Test Cat']);
        
        // Verify admin was created correctly
        $this->assertEquals(UserRole::ADMIN, $admin->role);
        
        Sanctum::actingAs($admin);
        
        $response = $this->getJson("/api/cats/{$cat->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Admin Test Cat'])
            ->assertJsonPath('data.viewer_permissions.can_edit', true);
    }

    #[Test]
    public function test_optional_auth_middleware_handles_invalid_token_gracefully(): void
    {
        $cat = Cat::factory()->create(['name' => 'Test Cat']);
        
        // Send request with invalid Bearer token
        $response = $this->withHeaders([
            'Authorization' => 'Bearer invalid-token-12345'
        ])->getJson("/api/cats/{$cat->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Test Cat'])
            ->assertJsonPath('data.viewer_permissions.can_edit', false);
    }

    #[Test]
    public function test_optional_auth_middleware_handles_malformed_auth_header(): void
    {
        $cat = Cat::factory()->create(['name' => 'Test Cat']);
        
        // Send request with malformed Authorization header
        $response = $this->withHeaders([
            'Authorization' => 'InvalidFormat token123'
        ])->getJson("/api/cats/{$cat->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Test Cat'])
            ->assertJsonPath('data.viewer_permissions.can_edit', false);
    }

    #[Test]
    public function test_cat_profile_returns_404_for_nonexistent_cat(): void
    {
        $response = $this->getJson('/api/cats/99999');
        $response->assertStatus(404);
    }
}
