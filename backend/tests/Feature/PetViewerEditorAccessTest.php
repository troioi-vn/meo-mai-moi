<?php

namespace Tests\Feature;

use App\Models\Pet;
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

        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/pets', [
            'name' => 'Buddy',
            'country' => 'VN',
            'pet_type_id' => $petType->id,
            'viewer_user_ids' => [$viewer->id],
            'editor_user_ids' => [$editor->id],
        ]);

        $response->assertStatus(201)->assertJson(fn (AssertableJson $json) => $json
            ->where('data.viewers.0.id', $viewer->id)
            ->where('data.editors.0.id', $editor->id)
            ->etc()
        );

        $petId = $response->json('data.id');
        $this->assertDatabaseHas('pet_viewers', ['pet_id' => $petId, 'user_id' => $viewer->id]);
        $this->assertDatabaseHas('pet_editors', ['pet_id' => $petId, 'user_id' => $editor->id]);
    }

    #[Test]
    public function viewer_can_view_private_pet(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();
        $pet = Pet::factory()->create(['user_id' => $owner->id]);
        $pet->viewers()->attach($viewer->id);

        Sanctum::actingAs($viewer);
        $response = $this->getJson("/api/pets/{$pet->id}");

        $response->assertStatus(200);
    }

    #[Test]
    public function non_viewer_cannot_view_private_pet(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $pet = Pet::factory()->create(['user_id' => $owner->id]);

        Sanctum::actingAs($otherUser);
        $response = $this->getJson("/api/pets/{$pet->id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function editor_can_update_and_gets_edit_permission_flag(): void
    {
        $owner = User::factory()->create();
        $editor = User::factory()->create();
        $pet = Pet::factory()->create(['user_id' => $owner->id, 'name' => 'Old Name']);
        $pet->editors()->attach($editor->id);

        Sanctum::actingAs($editor);
        $response = $this->putJson("/api/pets/{$pet->id}", ['name' => 'New Name']);

        $response->assertStatus(200)
            ->assertJsonPath('data.viewer_permissions.can_edit', true);

        $this->assertDatabaseHas('pets', ['id' => $pet->id, 'name' => 'New Name']);
    }
}

