<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

class OwnershipPermissionTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_cat_owner_has_edit_permissions_on_their_cat(): void
    {
        $owner = User::factory()->create(['role' => UserRole::CAT_OWNER->value]);
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        Sanctum::actingAs($owner);

        $response = $this->getJson("/api/cats/{$cat->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.can_edit', true);
    }

    #[Test]
    public function test_non_owner_cannot_edit_others_cats(): void
    {
        $owner = User::factory()->create(['role' => UserRole::CAT_OWNER->value]);
        $otherUser = User::factory()->create(['role' => UserRole::CAT_OWNER->value]);
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        Sanctum::actingAs($otherUser);

        $response = $this->getJson("/api/cats/{$cat->id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function test_viewer_role_cannot_edit_any_cats(): void
    {
        $owner = User::factory()->create(['role' => UserRole::CAT_OWNER->value]);
        $viewer = User::factory()->create(['role' => UserRole::VIEWER->value]);
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        Sanctum::actingAs($viewer);

        $response = $this->getJson("/api/cats/{$cat->id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function test_helper_role_cannot_edit_others_cats_but_can_view_contact(): void
    {
        $owner = User::factory()->create(['role' => UserRole::CAT_OWNER->value]);
        $helper = User::factory()->create(['role' => UserRole::HELPER->value]);
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        Sanctum::actingAs($helper);

        $response = $this->getJson("/api/cats/{$cat->id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function test_helper_role_can_edit_their_own_cats(): void
    {
        $helperOwner = User::factory()->create(['role' => UserRole::HELPER->value]);
        $cat = Cat::factory()->create(['user_id' => $helperOwner->id]);
        Sanctum::actingAs($helperOwner);

        $response = $this->getJson("/api/cats/{$cat->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.can_edit', true)
            ->assertJsonPath('data.viewer_permissions.can_view_contact', false);
    }

    #[Test]
    public function test_admin_can_edit_any_cat_regardless_of_ownership(): void
    {
        $owner = User::factory()->create(['role' => UserRole::CAT_OWNER->value]);
        $admin = User::factory()->create(['role' => UserRole::ADMIN->value]);
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        Sanctum::actingAs($admin);

        $response = $this->getJson("/api/cats/{$cat->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.can_edit', true)
            ->assertJsonPath('data.viewer_permissions.can_view_contact', true);
    }

    #[Test]
    public function test_ownership_logic_works_with_multiple_cats(): void
    {
        $user1 = User::factory()->create(['role' => UserRole::CAT_OWNER->value]);
        $user2 = User::factory()->create(['role' => UserRole::CAT_OWNER->value]);
        
        $cat1 = Cat::factory()->create(['user_id' => $user1->id, 'name' => 'User1 Cat']);
        $cat2 = Cat::factory()->create(['user_id' => $user2->id, 'name' => 'User2 Cat']);

        // User1 can edit their own cat
        Sanctum::actingAs($user1);
        $response1 = $this->getJson("/api/cats/{$cat1->id}");
        $response1->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.can_edit', true);

        // User1 cannot edit User2's cat
        $response2 = $this->getJson("/api/cats/{$cat2->id}");
        $response2->assertStatus(403);

        // User2 can edit their own cat
        Sanctum::actingAs($user2);
        $response3 = $this->getJson("/api/cats/{$cat2->id}");
        $response3->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.can_edit', true);

        // User2 cannot edit User1's cat
        $response4 = $this->getJson("/api/cats/{$cat1->id}");
        $response4->assertStatus(403);
    }

    #[Test]
    public function test_ownership_persists_across_user_role_changes(): void
    {
        // Create user as VIEWER initially
        $user = User::factory()->create(['role' => UserRole::VIEWER->value]);
        $cat = Cat::factory()->create(['user_id' => $user->id]);
        
        Sanctum::actingAs($user);
        
        // Even as VIEWER, they should be able to edit their own cat
        $response = $this->getJson("/api/cats/{$cat->id}");
        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.can_edit', true);

        // Change role to CAT_OWNER
        $user->update(['role' => UserRole::CAT_OWNER->value]);
        $user->refresh();
        
        // Should still be able to edit their cat
        Sanctum::actingAs($user);
        $response2 = $this->getJson("/api/cats/{$cat->id}");
        $response2->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.can_edit', true);
    }

    #[Test]
    public function test_permissions_are_consistent_for_update_endpoint(): void
    {
        $owner = User::factory()->create(['role' => UserRole::CAT_OWNER->value]);
        $nonOwner = User::factory()->create(['role' => UserRole::CAT_OWNER->value]);
        $cat = Cat::factory()->create(['user_id' => $owner->id, 'name' => 'Original Name']);

        // Owner should be able to update their cat
        Sanctum::actingAs($owner);
        $updateResponse = $this->putJson("/api/cats/{$cat->id}", ['name' => 'Updated Name']);
        $updateResponse->assertStatus(200)
            ->assertJson(['data' => ['name' => 'Updated Name']]);

        // Non-owner should not be able to update
        Sanctum::actingAs($nonOwner);
        $forbiddenResponse = $this->putJson("/api/cats/{$cat->id}", ['name' => 'Hacker Name']);
        $forbiddenResponse->assertStatus(403);

        // Verify the name wasn't changed by the non-owner
        $cat->refresh();
        $this->assertEquals('Updated Name', $cat->name);
    }
}
