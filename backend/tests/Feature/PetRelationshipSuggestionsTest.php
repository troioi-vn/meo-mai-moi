<?php

namespace Tests\Feature;

use App\Enums\PetRelationshipType;
use App\Models\PetRelationship;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PetRelationshipSuggestionsTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function owner_sees_previously_shared_user_on_another_pet(): void
    {
        $owner = User::factory()->create();
        $collaborator = User::factory()->create(['name' => 'Alice Collaborator']);
        $petA = $this->createPetWithOwner($owner);
        $petB = $this->createPetWithOwner($owner);

        PetRelationship::create([
            'pet_id' => $petA->id,
            'user_id' => $collaborator->id,
            'relationship_type' => PetRelationshipType::EDITOR,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs($owner);

        $response = $this->getJson("/api/pets/{$petB->id}/relationship-suggestions");

        $response->assertOk();
        $response->assertJsonPath('data.0.id', $collaborator->id);
        $response->assertJsonPath('data.0.name', $collaborator->name);
    }

    #[Test]
    public function user_already_on_current_pet_is_not_suggested(): void
    {
        $owner = User::factory()->create();
        $collaborator = User::factory()->create();
        $petA = $this->createPetWithOwner($owner);
        $petB = $this->createPetWithOwner($owner);

        PetRelationship::create([
            'pet_id' => $petA->id,
            'user_id' => $collaborator->id,
            'relationship_type' => PetRelationshipType::EDITOR,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        PetRelationship::create([
            'pet_id' => $petB->id,
            'user_id' => $collaborator->id,
            'relationship_type' => PetRelationshipType::VIEWER,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs($owner);

        $response = $this->getJson("/api/pets/{$petB->id}/relationship-suggestions");

        $response->assertOk();
        $this->assertCount(0, $response->json('data'));
    }

    #[Test]
    public function non_owner_cannot_list_suggestions(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        Sanctum::actingAs($other);

        $response = $this->getJson("/api/pets/{$pet->id}/relationship-suggestions");

        $response->assertStatus(403);
    }

    #[Test]
    public function owner_can_directly_add_previously_shared_user(): void
    {
        $owner = User::factory()->create();
        $collaborator = User::factory()->create();
        $petA = $this->createPetWithOwner($owner);
        $petB = $this->createPetWithOwner($owner);

        PetRelationship::create([
            'pet_id' => $petA->id,
            'user_id' => $collaborator->id,
            'relationship_type' => PetRelationshipType::EDITOR,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/pets/{$petB->id}/users", [
            'user_id' => $collaborator->id,
            'relationship_type' => 'editor',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.user.id', $collaborator->id);
        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $petB->id,
            'user_id' => $collaborator->id,
            'relationship_type' => 'editor',
            'end_at' => null,
        ]);
    }

    #[Test]
    public function owner_with_no_other_shared_pets_gets_empty_suggestions(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        Sanctum::actingAs($owner);

        $response = $this->getJson("/api/pets/{$pet->id}/relationship-suggestions");

        $response->assertOk();
        $this->assertCount(0, $response->json('data'));
    }

    #[Test]
    public function direct_add_is_idempotent_for_same_role(): void
    {
        $owner = User::factory()->create();
        $collaborator = User::factory()->create();
        $petA = $this->createPetWithOwner($owner);
        $petB = $this->createPetWithOwner($owner);

        PetRelationship::create([
            'pet_id' => $petA->id,
            'user_id' => $collaborator->id,
            'relationship_type' => PetRelationshipType::EDITOR,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/pets/{$petB->id}/users", [
            'user_id' => $collaborator->id,
            'relationship_type' => 'editor',
        ])->assertStatus(201);

        $this->postJson("/api/pets/{$petB->id}/users", [
            'user_id' => $collaborator->id,
            'relationship_type' => 'editor',
        ])->assertStatus(422)
            ->assertJsonPath('message', __('messages.pets.user_not_previously_shared'));
    }

    #[Test]
    public function direct_add_rejects_unknown_user(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/pets/{$pet->id}/users", [
            'user_id' => $stranger->id,
            'relationship_type' => 'editor',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', __('messages.pets.user_not_previously_shared'));
    }

    #[Test]
    public function direct_add_rejects_self(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/pets/{$pet->id}/users", [
            'user_id' => $owner->id,
            'relationship_type' => 'editor',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', __('messages.pets.cannot_assign_self'));
    }

    #[Test]
    public function owner_can_change_co_owner_to_viewer(): void
    {
        $owner = User::factory()->create();
        $coOwner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $coOwner->id,
            'relationship_type' => PetRelationshipType::OWNER,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs($owner);

        $response = $this->putJson("/api/pets/{$pet->id}/users/{$coOwner->id}", [
            'relationship_type' => 'viewer',
        ]);

        $response->assertOk();

        $this->assertDatabaseMissing('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $coOwner->id,
            'relationship_type' => 'owner',
            'end_at' => null,
        ]);
        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $coOwner->id,
            'relationship_type' => 'viewer',
            'end_at' => null,
        ]);
    }

    #[Test]
    public function co_owner_can_change_original_owner_to_editor_when_an_owner_remains(): void
    {
        $owner = User::factory()->create();
        $coOwner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $coOwner->id,
            'relationship_type' => PetRelationshipType::OWNER,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs($coOwner);

        $response = $this->putJson("/api/pets/{$pet->id}/users/{$owner->id}", [
            'relationship_type' => 'editor',
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $coOwner->id,
            'relationship_type' => 'owner',
            'end_at' => null,
        ]);
        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'relationship_type' => 'editor',
            'end_at' => null,
        ]);
    }

    #[Test]
    public function owner_cannot_change_own_role(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        Sanctum::actingAs($owner);

        $response = $this->putJson("/api/pets/{$pet->id}/users/{$owner->id}", [
            'relationship_type' => 'viewer',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', __('messages.pets.cannot_assign_self'));
    }
}
