<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class OwnershipPermissionTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_pet_owner_has_edit_permissions_on_their_pet(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        Sanctum::actingAs($owner);

        $response = $this->getJson("/api/pets/{$pet->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.can_edit', true);
    }

    #[Test]
    public function test_non_owner_cannot_edit_others_pets(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        Sanctum::actingAs($otherUser);

        $response = $this->getJson("/api/pets/{$pet->id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function test_viewer_role_cannot_edit_any_pets(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        Sanctum::actingAs($viewer);

        $response = $this->getJson("/api/pets/{$pet->id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function test_helper_role_cannot_edit_others_pets(): void
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        Sanctum::actingAs($helper);

        $response = $this->getJson("/api/pets/{$pet->id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function test_owner_can_edit_their_own_pet(): void
    {
        $petOwner = User::factory()->create();
        $pet = $this->createPetWithOwner($petOwner);
        Sanctum::actingAs($petOwner);

        $response = $this->getJson("/api/pets/{$pet->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.can_edit', true)
            ->assertJsonPath('data.viewer_permissions.can_view_contact', false);
    }

    #[Test]
    public function test_admin_can_edit_any_pet_regardless_of_ownership(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        Role::firstOrCreate(['name' => 'admin']);
        $admin->assignRole('admin');
        $pet = $this->createPetWithOwner($owner);
        Sanctum::actingAs($admin);

        $response = $this->getJson("/api/pets/{$pet->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.can_edit', true)
            ->assertJsonPath('data.viewer_permissions.can_view_contact', true);
    }

    #[Test]
    public function test_ownership_logic_works_with_multiple_pets(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $pet1 = Pet::factory()->create(['created_by' => $user1->id, 'name' => 'User1 Pet']);
        $pet2 = Pet::factory()->create(['created_by' => $user2->id, 'name' => 'User2 Pet']);

        // User1 can edit their own cat
        Sanctum::actingAs($user1);
        $response1 = $this->getJson("/api/pets/{$pet1->id}");
        $response1->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.can_edit', true);

        // User1 cannot edit User2's cat
        $response2 = $this->getJson("/api/pets/{$pet2->id}");
        $response2->assertStatus(403);

        // User2 can edit their own cat
        Sanctum::actingAs($user2);
        $response3 = $this->getJson("/api/pets/{$pet2->id}");
        $response3->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.can_edit', true);

        // User2 cannot edit User1's cat
        $response4 = $this->getJson("/api/pets/{$pet1->id}");
        $response4->assertStatus(403);
    }

    #[Test]
    public function test_ownership_persists_across_user_role_changes_for_pet(): void
    {
        $user = User::factory()->create();
        $pet = $this->createPetWithOwner($user);

        Sanctum::actingAs($user);

        // Even as VIEWER, they should be able to edit their own cat
        $response = $this->getJson("/api/pets/{$pet->id}");
        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.can_edit', true);

        // Assign a role (not required for ownership logic but ensures compatibility)
        Role::firstOrCreate(['name' => 'owner']);
        $user->assignRole('owner');
        $user->refresh();

        // Should still be able to edit their cat
        Sanctum::actingAs($user);
        $response2 = $this->getJson("/api/pets/{$pet->id}");
        $response2->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.can_edit', true);
    }

    #[Test]
    public function test_permissions_are_consistent_for_pet_update_endpoint(): void
    {
        $owner = User::factory()->create();
        $nonOwner = User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'name' => 'Original Name']);

        // Owner should be able to update their cat
        Sanctum::actingAs($owner);
        $updateResponse = $this->putJson("/api/pets/{$pet->id}", ['name' => 'Updated Name']);
        $updateResponse->assertStatus(200)
            ->assertJson(['data' => ['name' => 'Updated Name']]);

        // Non-owner should not be able to update
        Sanctum::actingAs($nonOwner);
        $forbiddenResponse = $this->putJson("/api/pets/{$pet->id}", ['name' => 'Hacker Name']);
        $forbiddenResponse->assertStatus(403);

        // Verify the name wasn't changed by the non-owner
        $pet->refresh();
        $this->assertEquals('Updated Name', $pet->name);
    }
}
