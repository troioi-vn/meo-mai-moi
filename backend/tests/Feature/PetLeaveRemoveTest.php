<?php

namespace Tests\Feature;

use App\Enums\PetRelationshipType;
use App\Models\PetRelationship;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PetLeaveRemoveTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function editor_can_leave_pet(): void
    {
        $owner = User::factory()->create();
        $editor = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $editor->id,
            'relationship_type' => PetRelationshipType::EDITOR,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs($editor);

        $response = $this->postJson("/api/pets/{$pet->id}/leave");

        $response->assertOk();
        $this->assertDatabaseMissing('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $editor->id,
            'end_at' => null,
        ]);
    }

    #[Test]
    public function viewer_can_leave_pet(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $viewer->id,
            'relationship_type' => PetRelationshipType::VIEWER,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs($viewer);

        $response = $this->postJson("/api/pets/{$pet->id}/leave");

        $response->assertOk();
    }

    #[Test]
    public function last_owner_cannot_leave(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/pets/{$pet->id}/leave");

        $response->assertStatus(409);
    }

    #[Test]
    public function co_owner_can_leave_when_not_last(): void
    {
        $owner1 = User::factory()->create();
        $owner2 = User::factory()->create();
        $pet = $this->createPetWithOwner($owner1);

        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $owner2->id,
            'relationship_type' => PetRelationshipType::OWNER,
            'start_at' => now(),
            'created_by' => $owner1->id,
        ]);

        Sanctum::actingAs($owner1);

        $response = $this->postJson("/api/pets/{$pet->id}/leave");

        $response->assertOk();
    }

    #[Test]
    public function owner_can_remove_editor(): void
    {
        $owner = User::factory()->create();
        $editor = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $editor->id,
            'relationship_type' => PetRelationshipType::EDITOR,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs($owner);

        $response = $this->deleteJson("/api/pets/{$pet->id}/users/{$editor->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $editor->id,
            'end_at' => null,
        ]);
    }

    #[Test]
    public function owner_can_remove_viewer(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $viewer->id,
            'relationship_type' => PetRelationshipType::VIEWER,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs($owner);

        $response = $this->deleteJson("/api/pets/{$pet->id}/users/{$viewer->id}");

        $response->assertOk();
    }

    #[Test]
    public function cannot_remove_owner_via_remove_endpoint(): void
    {
        $owner1 = User::factory()->create();
        $owner2 = User::factory()->create();
        $pet = $this->createPetWithOwner($owner1);

        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $owner2->id,
            'relationship_type' => PetRelationshipType::OWNER,
            'start_at' => now(),
            'created_by' => $owner1->id,
        ]);

        Sanctum::actingAs($owner1);

        $response = $this->deleteJson("/api/pets/{$pet->id}/users/{$owner2->id}");

        $response->assertStatus(422);
    }

    #[Test]
    public function non_owner_cannot_remove_users(): void
    {
        $owner = User::factory()->create();
        $editor = User::factory()->create();
        $other = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $editor->id,
            'relationship_type' => PetRelationshipType::EDITOR,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs($other);

        $response = $this->deleteJson("/api/pets/{$pet->id}/users/{$editor->id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function user_without_relationship_cannot_leave(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        Sanctum::actingAs($stranger);

        $response = $this->postJson("/api/pets/{$pet->id}/leave");

        $response->assertStatus(404);
    }
}
