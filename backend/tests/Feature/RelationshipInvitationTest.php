<?php

namespace Tests\Feature;

use App\Enums\PetRelationshipType;
use App\Enums\RelationshipInvitationStatus;
use App\Models\PetRelationship;
use App\Models\RelationshipInvitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RelationshipInvitationTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function owner_can_create_invitation(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/pets/{$pet->id}/relationship-invitations", [
            'relationship_type' => 'editor',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.invitation.relationship_type', 'editor');
        $response->assertJsonPath('data.invitation.status', 'pending');
        $this->assertNotNull($response->json('data.invitation_url'));
        $this->assertDatabaseHas('relationship_invitations', [
            'pet_id' => $pet->id,
            'invited_by_user_id' => $owner->id,
            'relationship_type' => 'editor',
            'status' => 'pending',
        ]);
    }

    #[Test]
    public function non_owner_cannot_create_invitation(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        Sanctum::actingAs($other);

        $response = $this->postJson("/api/pets/{$pet->id}/relationship-invitations", [
            'relationship_type' => 'viewer',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function owner_can_list_pending_invitations(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        RelationshipInvitation::create([
            'pet_id' => $pet->id,
            'invited_by_user_id' => $owner->id,
            'token' => RelationshipInvitation::generateUniqueToken(),
            'relationship_type' => PetRelationshipType::EDITOR,
            'status' => RelationshipInvitationStatus::PENDING,
            'expires_at' => now()->addHour(),
        ]);

        Sanctum::actingAs($owner);

        $response = $this->getJson("/api/pets/{$pet->id}/relationship-invitations");

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function anyone_can_preview_invitation_with_token(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $invitation = RelationshipInvitation::create([
            'pet_id' => $pet->id,
            'invited_by_user_id' => $owner->id,
            'token' => RelationshipInvitation::generateUniqueToken(),
            'relationship_type' => PetRelationshipType::VIEWER,
            'status' => RelationshipInvitationStatus::PENDING,
            'expires_at' => now()->addHour(),
        ]);

        $response = $this->getJson("/api/relationship-invitations/{$invitation->token}");

        $response->assertOk();
        $response->assertJsonPath('data.is_valid', true);
        $response->assertJsonPath('data.pet.name', $pet->name);
        $response->assertJsonPath('data.inviter.name', $owner->name);
    }

    #[Test]
    public function user_can_accept_invitation(): void
    {
        $owner = User::factory()->create();
        $accepter = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $invitation = RelationshipInvitation::create([
            'pet_id' => $pet->id,
            'invited_by_user_id' => $owner->id,
            'token' => RelationshipInvitation::generateUniqueToken(),
            'relationship_type' => PetRelationshipType::EDITOR,
            'status' => RelationshipInvitationStatus::PENDING,
            'expires_at' => now()->addHour(),
        ]);

        Sanctum::actingAs($accepter);

        $response = $this->postJson("/api/relationship-invitations/{$invitation->token}/accept");

        $response->assertOk();
        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $accepter->id,
            'relationship_type' => 'editor',
            'end_at' => null,
        ]);
        $this->assertDatabaseHas('relationship_invitations', [
            'id' => $invitation->id,
            'status' => 'accepted',
            'accepted_by_user_id' => $accepter->id,
        ]);
    }

    #[Test]
    public function accepting_higher_role_ends_lower_role(): void
    {
        $owner = User::factory()->create();
        $user = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        // Give user viewer access first
        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $user->id,
            'relationship_type' => PetRelationshipType::VIEWER,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        // Create editor invitation
        $invitation = RelationshipInvitation::create([
            'pet_id' => $pet->id,
            'invited_by_user_id' => $owner->id,
            'token' => RelationshipInvitation::generateUniqueToken(),
            'relationship_type' => PetRelationshipType::EDITOR,
            'status' => RelationshipInvitationStatus::PENDING,
            'expires_at' => now()->addHour(),
        ]);

        Sanctum::actingAs($user);

        $this->postJson("/api/relationship-invitations/{$invitation->token}/accept")
            ->assertOk();

        // Viewer relationship should be ended
        $this->assertDatabaseMissing('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $user->id,
            'relationship_type' => 'viewer',
            'end_at' => null,
        ]);

        // Editor relationship should exist
        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $user->id,
            'relationship_type' => 'editor',
            'end_at' => null,
        ]);
    }

    #[Test]
    public function cannot_accept_own_invitation(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $invitation = RelationshipInvitation::create([
            'pet_id' => $pet->id,
            'invited_by_user_id' => $owner->id,
            'token' => RelationshipInvitation::generateUniqueToken(),
            'relationship_type' => PetRelationshipType::EDITOR,
            'status' => RelationshipInvitationStatus::PENDING,
            'expires_at' => now()->addHour(),
        ]);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/relationship-invitations/{$invitation->token}/accept");

        $response->assertStatus(422);
    }

    #[Test]
    public function cannot_accept_expired_invitation(): void
    {
        $owner = User::factory()->create();
        $accepter = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $invitation = RelationshipInvitation::create([
            'pet_id' => $pet->id,
            'invited_by_user_id' => $owner->id,
            'token' => RelationshipInvitation::generateUniqueToken(),
            'relationship_type' => PetRelationshipType::VIEWER,
            'status' => RelationshipInvitationStatus::PENDING,
            'expires_at' => now()->subMinute(),
        ]);

        Sanctum::actingAs($accepter);

        $response = $this->postJson("/api/relationship-invitations/{$invitation->token}/accept");

        $response->assertStatus(410);
    }

    #[Test]
    public function user_can_decline_invitation(): void
    {
        $owner = User::factory()->create();
        $decliner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $invitation = RelationshipInvitation::create([
            'pet_id' => $pet->id,
            'invited_by_user_id' => $owner->id,
            'token' => RelationshipInvitation::generateUniqueToken(),
            'relationship_type' => PetRelationshipType::VIEWER,
            'status' => RelationshipInvitationStatus::PENDING,
            'expires_at' => now()->addHour(),
        ]);

        Sanctum::actingAs($decliner);

        $response = $this->postJson("/api/relationship-invitations/{$invitation->token}/decline");

        $response->assertOk();
        $this->assertDatabaseHas('relationship_invitations', [
            'id' => $invitation->id,
            'status' => 'declined',
        ]);
    }

    #[Test]
    public function owner_can_revoke_invitation(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $invitation = RelationshipInvitation::create([
            'pet_id' => $pet->id,
            'invited_by_user_id' => $owner->id,
            'token' => RelationshipInvitation::generateUniqueToken(),
            'relationship_type' => PetRelationshipType::EDITOR,
            'status' => RelationshipInvitationStatus::PENDING,
            'expires_at' => now()->addHour(),
        ]);

        Sanctum::actingAs($owner);

        $response = $this->deleteJson("/api/pets/{$pet->id}/relationship-invitations/{$invitation->id}");

        $response->assertOk();
        $this->assertDatabaseHas('relationship_invitations', [
            'id' => $invitation->id,
            'status' => 'revoked',
        ]);
    }

    #[Test]
    public function unauthenticated_cannot_create_invitation(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $response = $this->postJson("/api/pets/{$pet->id}/relationship-invitations", [
            'relationship_type' => 'viewer',
        ]);

        $response->assertStatus(401);
    }
}
