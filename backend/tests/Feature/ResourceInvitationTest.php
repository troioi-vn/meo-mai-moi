<?php

namespace Tests\Feature;

use App\Enums\PetRelationshipType;
use App\Enums\ResourceInvitationStatus;
use App\Enums\ResourceInvitationType;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\PetResourceInvitation;
use App\Models\ResourceInvitation;
use App\Models\User;
use App\Services\PetRelationshipService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ResourceInvitationTest extends TestCase
{
    use RefreshDatabase;

    private function createPetInvitation(
        Pet $pet,
        User $inviter,
        PetRelationshipType $type = PetRelationshipType::EDITOR,
        ?\DateTimeInterface $expiresAt = null,
        ResourceInvitationStatus $status = ResourceInvitationStatus::PENDING,
    ): ResourceInvitation {
        $invitation = ResourceInvitation::query()->create([
            'type' => ResourceInvitationType::PET,
            'token' => ResourceInvitation::generateUniqueToken(),
            'invited_by_user_id' => $inviter->id,
            'status' => $status,
            'expires_at' => $expiresAt ?? now()->addHour(),
        ]);

        PetResourceInvitation::query()->create([
            'resource_invitation_id' => $invitation->id,
            'pet_id' => $pet->id,
            'relationship_type' => $type,
        ]);

        return $invitation->fresh(['petDetail', 'inviter']);
    }

    #[Test]
    public function migration_preserves_existing_pet_invitation_data(): void
    {
        $inviter = User::factory()->create();
        $accepter = User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $inviter->id]);
        $token = str_repeat('m', 64);
        $expiresAt = now()->addHour()->startOfSecond();
        $acceptedAt = now()->subMinute()->startOfSecond();
        $createdAt = now()->subMinutes(5)->startOfSecond();

        $groupsMigration = require database_path(
            'migrations/2026_07_14_120000_create_groups_tables.php'
        );
        $migration = require database_path(
            'migrations/2026_07_14_000000_create_resource_invitations_tables.php'
        );
        $groupsMigration->down();
        $migration->down();

        DB::table('relationship_invitations')->insert([
            'pet_id' => $pet->id,
            'invited_by_user_id' => $inviter->id,
            'token' => $token,
            'relationship_type' => PetRelationshipType::EDITOR->value,
            'status' => ResourceInvitationStatus::ACCEPTED->value,
            'expires_at' => $expiresAt,
            'accepted_at' => $acceptedAt,
            'declined_at' => null,
            'revoked_at' => null,
            'accepted_by_user_id' => $accepter->id,
            'created_at' => $createdAt,
            'updated_at' => $acceptedAt,
        ]);

        $migration->up();
        $groupsMigration->up();

        $this->assertFalse(Schema::hasTable('relationship_invitations'));

        $migrated = ResourceInvitation::query()
            ->where('token', $token)
            ->with('petDetail')
            ->firstOrFail();

        $this->assertSame(ResourceInvitationType::PET, $migrated->type);
        $this->assertSame(ResourceInvitationStatus::ACCEPTED, $migrated->status);
        $this->assertSame($inviter->id, $migrated->invited_by_user_id);
        $this->assertSame($accepter->id, $migrated->accepted_by_user_id);
        $this->assertTrue($migrated->expires_at->equalTo($expiresAt));
        $this->assertTrue($migrated->accepted_at?->equalTo($acceptedAt));
        $this->assertTrue($migrated->created_at->equalTo($createdAt));
        $this->assertSame($pet->id, $migrated->petDetail?->pet_id);
        $this->assertSame(
            PetRelationshipType::EDITOR,
            $migrated->petDetail?->relationship_type
        );
    }

    #[Test]
    public function owner_can_create_invitation(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/pets/{$pet->id}/invitations", [
            'relationship_type' => 'editor',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.invitation.relationship_type', 'editor');
        $response->assertJsonPath('data.invitation.status', 'pending');
        $response->assertJsonPath('data.invitation.type', 'pet');
        $this->assertNotNull($response->json('data.invitation_url'));
        $this->assertStringContainsString('/invite/', (string) $response->json('data.invitation_url'));
        $this->assertDatabaseHas('resource_invitations', [
            'invited_by_user_id' => $owner->id,
            'type' => 'pet',
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('pet_resource_invitations', [
            'pet_id' => $pet->id,
            'relationship_type' => 'editor',
        ]);
    }

    #[Test]
    public function non_owner_cannot_create_invitation(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        Sanctum::actingAs($other);

        $response = $this->postJson("/api/pets/{$pet->id}/invitations", [
            'relationship_type' => 'viewer',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function admin_cannot_create_invitation_for_unowned_pet(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        Role::firstOrCreate(['name' => 'admin']);
        $admin->assignRole('admin');

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/pets/{$pet->id}/invitations", [
            'relationship_type' => 'viewer',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function owner_can_list_pending_invitations(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $this->createPetInvitation($pet, $owner);

        Sanctum::actingAs($owner);

        $response = $this->getJson("/api/pets/{$pet->id}/invitations");

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertStringContainsString('/invite/', (string) $response->json('data.0.invitation_url'));
    }

    #[Test]
    public function non_owner_gets_standard_api_error_when_listing_invitations(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        Sanctum::actingAs($other);

        $response = $this->getJson("/api/pets/{$pet->id}/invitations");

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'data' => null,
                'message' => __('messages.forbidden'),
                'error' => __('messages.forbidden'),
            ]);
    }

    #[Test]
    public function anyone_can_preview_invitation_with_token(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $invitation = $this->createPetInvitation($pet, $owner, PetRelationshipType::VIEWER);

        $response = $this->getJson("/api/resource-invitations/{$invitation->token}");

        $response->assertOk();
        $response->assertJsonPath('data.is_valid', true);
        $response->assertJsonPath('data.type', 'pet');
        $response->assertJsonPath('data.target.name', $pet->name);
        $response->assertJsonPath('data.target.role', 'viewer');
        $response->assertJsonPath('data.inviter.name', $owner->name);
        $response->assertJsonMissingPath('data.pet');
        $response->assertJsonMissingPath('data.id');
        $response->assertJsonMissingPath('data.token');
        $response->assertJsonMissingPath('data.inviter.id');
        $response->assertJsonMissingPath('data.target.id');
        $response->assertJsonMissingPath('data.target.pet_type.slug');
    }

    #[Test]
    public function malformed_invitation_tokens_are_rejected(): void
    {
        $response = $this->getJson('/api/resource-invitations/not-a-valid-token');

        $response->assertNotFound();
    }

    #[Test]
    public function user_can_accept_invitation(): void
    {
        $owner = User::factory()->create();
        $accepter = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $invitation = $this->createPetInvitation($pet, $owner, PetRelationshipType::EDITOR);

        Sanctum::actingAs($accepter);

        $response = $this->postJson("/api/resource-invitations/{$invitation->token}/accept");

        $response->assertOk();
        $response->assertJsonPath('data.pet_id', $pet->id);
        $response->assertJsonPath('data.destination', '/pets/'.$pet->id);
        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $accepter->id,
            'relationship_type' => 'editor',
            'end_at' => null,
        ]);
        $this->assertDatabaseHas('resource_invitations', [
            'id' => $invitation->id,
            'status' => 'accepted',
            'accepted_by_user_id' => $accepter->id,
        ]);
    }

    #[Test]
    public function mcp_pet_invitation_flow_keeps_token_out_of_paths_and_replays_accept(): void
    {
        $owner = User::factory()->create();
        $recipient = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $invitation = $this->createPetInvitation($pet, $owner, PetRelationshipType::VIEWER);
        $version = $invitation->updated_at->toJSON();
        $token = $recipient->createToken('MCP sharing', ['sharing:read', 'sharing:write'])
            ->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/mcp/resource-invitations/preview', [
                'token' => $invitation->token,
            ])->assertOk()
            ->assertJsonPath('data.target.name', $pet->name)
            ->assertJsonPath('data.target.role', 'viewer')
            ->assertJsonPath('data.updated_at', $version)
            ->assertJsonMissingPath('data.token');

        $payload = ['token' => $invitation->token, 'base_version' => $version];
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'mcp-invitation-accept')
            ->postJson('/api/mcp/resource-invitations/accept', $payload)
            ->assertOk()
            ->assertJsonPath('data.pet_id', $pet->id);
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'mcp-invitation-accept')
            ->postJson('/api/mcp/resource-invitations/accept', $payload)
            ->assertOk()
            ->assertJsonPath('data.pet_id', $pet->id);

        $this->assertSame(1, PetRelationship::query()
            ->where('pet_id', $pet->id)
            ->where('user_id', $recipient->id)
            ->where('relationship_type', PetRelationshipType::VIEWER)
            ->whereNull('end_at')
            ->count());
        $this->assertSame(
            0,
            DB::table('api_request_logs')
                ->where('path', 'like', '%'.$invitation->token.'%')
                ->count()
        );
    }

    #[Test]
    public function accepting_higher_role_preserves_lower_role(): void
    {
        $owner = User::factory()->create();
        $user = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $user->id,
            'relationship_type' => PetRelationshipType::VIEWER,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        $invitation = $this->createPetInvitation($pet, $owner, PetRelationshipType::EDITOR);

        Sanctum::actingAs($user);

        $this->postJson("/api/resource-invitations/{$invitation->token}/accept")
            ->assertOk();

        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $user->id,
            'relationship_type' => 'viewer',
            'end_at' => null,
        ]);

        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $user->id,
            'relationship_type' => 'editor',
            'end_at' => null,
        ]);
    }

    #[Test]
    public function accepting_exact_existing_role_is_idempotent(): void
    {
        $owner = User::factory()->create();
        $user = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $user->id,
            'relationship_type' => PetRelationshipType::EDITOR,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        $invitation = $this->createPetInvitation($pet, $owner, PetRelationshipType::EDITOR);

        Sanctum::actingAs($user);

        $this->postJson("/api/resource-invitations/{$invitation->token}/accept")
            ->assertOk();

        $this->assertSame(
            1,
            PetRelationship::query()
                ->where('pet_id', $pet->id)
                ->where('user_id', $user->id)
                ->where('relationship_type', PetRelationshipType::EDITOR)
                ->whereNull('end_at')
                ->count()
        );
        $this->assertDatabaseHas('resource_invitations', [
            'id' => $invitation->id,
            'status' => 'accepted',
        ]);
    }

    #[Test]
    public function preview_exposes_exact_role_and_broad_access_flags(): void
    {
        $owner = User::factory()->create();
        $user = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $user->id,
            'relationship_type' => PetRelationshipType::VIEWER,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        $invitation = $this->createPetInvitation($pet, $owner, PetRelationshipType::EDITOR);

        Sanctum::actingAs($user);

        $this->getJson("/api/resource-invitations/{$invitation->token}")
            ->assertOk()
            ->assertJsonPath('data.already_has_access', true)
            ->assertJsonPath('data.already_has_invited_role', false);
    }

    #[Test]
    public function preview_marks_group_access_as_already_has_access(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $group = Group::factory()->create([
            'name' => 'Rescue',
            'created_by_user_id' => $owner->id,
        ]);
        GroupMembership::factory()->admin()->active()->create([
            'group_id' => $group->id,
            'user_id' => $owner->id,
        ]);
        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $owner->id,
        ]);
        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $pet->id,
            'added_by_user_id' => $owner->id,
        ]);

        $invitation = $this->createPetInvitation($pet, $owner, PetRelationshipType::EDITOR);

        Sanctum::actingAs($member);

        $this->getJson("/api/resource-invitations/{$invitation->token}")
            ->assertOk()
            ->assertJsonPath('data.already_has_access', true)
            ->assertJsonPath('data.already_has_invited_role', false);
    }

    #[Test]
    public function accepting_owner_invitation_adds_pet_to_my_pets_and_shows_all_owners(): void
    {
        $owner = User::factory()->create();
        $firstCoOwner = User::factory()->create(['name' => 'First Co-owner']);
        $secondCoOwner = User::factory()->create(['name' => 'Second Co-owner']);
        $pet = $this->createPetWithOwner($owner);

        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $firstCoOwner->id,
            'relationship_type' => PetRelationshipType::OWNER,
            'start_at' => now(),
            'created_by' => $owner->id,
        ]);

        $invitation = $this->createPetInvitation($pet, $owner, PetRelationshipType::OWNER);

        Sanctum::actingAs($secondCoOwner);

        $this->postJson("/api/resource-invitations/{$invitation->token}/accept")
            ->assertOk();

        $sections = $this->getJson('/api/my-pets/sections')
            ->assertOk()
            ->json('data');

        $this->assertContains($pet->id, collect($sections['owned'])->pluck('id')->all());

        $relationships = $this->getJson("/api/pets/{$pet->id}")
            ->assertOk()
            ->json('data.relationships');

        $ownerIds = collect($relationships)
            ->where('relationship_type', 'owner')
            ->whereNull('end_at')
            ->pluck('user_id')
            ->all();

        $this->assertEqualsCanonicalizing(
            [$owner->id, $firstCoOwner->id, $secondCoOwner->id],
            $ownerIds
        );
    }

    #[Test]
    public function cannot_accept_own_invitation(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $invitation = $this->createPetInvitation($pet, $owner);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/resource-invitations/{$invitation->token}/accept");

        $response->assertStatus(422);
    }

    #[Test]
    public function cannot_accept_expired_invitation(): void
    {
        $owner = User::factory()->create();
        $accepter = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $invitation = $this->createPetInvitation(
            $pet,
            $owner,
            PetRelationshipType::VIEWER,
            now()->subMinute()
        );

        Sanctum::actingAs($accepter);

        $response = $this->postJson("/api/resource-invitations/{$invitation->token}/accept");

        $response->assertStatus(410);
        $this->assertDatabaseHas('resource_invitations', [
            'id' => $invitation->id,
            'status' => 'expired',
        ]);
    }

    #[Test]
    public function authority_loss_during_acceptance_persists_revocation(): void
    {
        $owner = User::factory()->create();
        $accepter = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $invitation = $this->createPetInvitation($pet, $owner);

        PetRelationship::query()
            ->where('pet_id', $pet->id)
            ->where('user_id', $owner->id)
            ->where('relationship_type', PetRelationshipType::OWNER)
            ->update(['end_at' => now()]);

        Sanctum::actingAs($accepter);

        $this->postJson("/api/resource-invitations/{$invitation->token}/accept")
            ->assertStatus(410);

        $this->assertDatabaseHas('resource_invitations', [
            'id' => $invitation->id,
            'status' => ResourceInvitationStatus::REVOKED->value,
        ]);
    }

    #[Test]
    public function deleted_pet_invitation_returns_terminal_response_instead_of_crashing(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $invitation = $this->createPetInvitation($pet, $owner);

        $pet->delete();

        $this->getJson("/api/resource-invitations/{$invitation->token}")
            ->assertStatus(410)
            ->assertJsonPath('message', __('resource_invitations.no_longer_valid'));

        $this->assertDatabaseHas('resource_invitations', [
            'id' => $invitation->id,
            'status' => ResourceInvitationStatus::REVOKED->value,
        ]);
    }

    #[Test]
    public function orphaned_pet_invitation_detail_returns_terminal_response_instead_of_crashing(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $invitation = $this->createPetInvitation($pet, $owner);

        PetResourceInvitation::query()
            ->where('resource_invitation_id', $invitation->id)
            ->delete();

        $this->getJson("/api/resource-invitations/{$invitation->token}")
            ->assertStatus(410)
            ->assertJsonPath('message', __('resource_invitations.no_longer_valid'));
    }

    #[Test]
    public function user_can_decline_invitation(): void
    {
        $owner = User::factory()->create();
        $decliner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $invitation = $this->createPetInvitation($pet, $owner, PetRelationshipType::VIEWER);

        Sanctum::actingAs($decliner);

        $response = $this->postJson("/api/resource-invitations/{$invitation->token}/decline");

        $response->assertNoContent();
        $this->assertDatabaseHas('resource_invitations', [
            'id' => $invitation->id,
            'status' => 'declined',
        ]);
    }

    #[Test]
    public function owner_can_revoke_invitation(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $invitation = $this->createPetInvitation($pet, $owner);

        Sanctum::actingAs($owner);

        $response = $this->deleteJson("/api/pets/{$pet->id}/invitations/{$invitation->id}");

        $response->assertNoContent();
        $this->assertDatabaseHas('resource_invitations', [
            'id' => $invitation->id,
            'status' => 'revoked',
        ]);
    }

    #[Test]
    public function losing_ownership_revokes_pending_invitations_issued_by_that_owner(): void
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

        $invitation = $this->createPetInvitation($pet, $owner);
        app(PetRelationshipService::class)->removeUserSharingAccess($pet, $owner);

        $this->assertDatabaseHas('resource_invitations', [
            'id' => $invitation->id,
            'status' => 'revoked',
        ]);
    }

    #[Test]
    public function leaving_as_a_co_owner_revokes_invitations_issued_by_that_owner(): void
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

        $invitation = $this->createPetInvitation($pet, $owner);
        Sanctum::actingAs($owner);

        $this->postJson("/api/pets/{$pet->id}/leave")
            ->assertNoContent();

        $this->assertDatabaseHas('resource_invitations', [
            'id' => $invitation->id,
            'status' => ResourceInvitationStatus::REVOKED->value,
        ]);
    }

    #[Test]
    public function unauthenticated_cannot_create_invitation(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $response = $this->postJson("/api/pets/{$pet->id}/invitations", [
            'relationship_type' => 'viewer',
        ]);

        $response->assertStatus(401);
    }
}
