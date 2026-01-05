<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\PetType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\Fluent\AssertableJson;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PetViewerEditorAccessTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function can_set_viewers_and_editors_on_create(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();
        $editor = User::factory()->create();
        $petType = PetType::factory()->create([
            'name' => 'Cat',
            'slug' => 'cat',
            'is_system' => true,
        ]);
        $city = City::factory()->create(['country' => 'VN']);

        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/pets', [
            'name' => 'Buddy',
            'country' => 'VN',
            'city_id' => $city->id,
            'pet_type_id' => $petType->id,
            'viewer_user_ids' => [$viewer->id],
            'editor_user_ids' => [$editor->id],
        ]);

        $response->assertStatus(201)->assertJson(
            fn (AssertableJson $json) => $json
                ->where('data.viewers.0.id', $viewer->id)
                ->where('data.editors.0.id', $editor->id)
                ->etc()
        );

        $petId = $response->json('data.id');
        $this->assertDatabaseHas('pet_relationships', ['pet_id' => $petId, 'user_id' => $viewer->id, 'relationship_type' => 'viewer', 'end_at' => null]);
        $this->assertDatabaseHas('pet_relationships', ['pet_id' => $petId, 'user_id' => $editor->id, 'relationship_type' => 'editor', 'end_at' => null]);
    }

    #[Test]
    public function viewer_can_view_private_pet(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $viewer->id,
            'relationship_type' => \App\Enums\PetRelationshipType::VIEWER,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs($viewer);
        $response = $this->getJson("/api/pets/{$pet->id}");

        $response->assertStatus(200);
    }

    #[Test]
    public function non_viewer_cannot_view_private_pet(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        Sanctum::actingAs($otherUser);
        $response = $this->getJson("/api/pets/{$pet->id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function editor_can_update_and_gets_edit_permission_flag(): void
    {
        $owner = User::factory()->create();
        $editor = User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'name' => 'Old Name']);
        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $editor->id,
            'relationship_type' => \App\Enums\PetRelationshipType::EDITOR,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs($editor);
        $response = $this->putJson("/api/pets/{$pet->id}", ['name' => 'New Name']);

        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.can_edit', true);

        $this->assertDatabaseHas('pets', ['id' => $pet->id, 'name' => 'New Name']);
    }

    #[Test]
    public function viewer_gets_is_viewer_permission_flag(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $viewer->id,
            'relationship_type' => \App\Enums\PetRelationshipType::VIEWER,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs($viewer);
        $response = $this->getJson("/api/pets/{$pet->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.is_viewer', true)
            ->assertJsonPath('data.viewer_permissions.is_owner', false)
            ->assertJsonPath('data.viewer_permissions.can_edit', false);
    }

    #[Test]
    public function viewer_can_view_pet_via_public_view_route(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $viewer->id,
            'relationship_type' => \App\Enums\PetRelationshipType::VIEWER,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs($viewer);
        $response = $this->getJson("/api/pets/{$pet->id}/view");

        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.is_viewer', true);
    }
}
