<?php

declare(strict_types=1);

namespace Tests\Feature\Group;

use App\Enums\GroupRole;
use App\Enums\ResourceInvitationStatus;
use App\Enums\ResourceInvitationType;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\GroupResourceInvitation;
use App\Models\ResourceInvitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class GroupCrudTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function create_group_makes_creator_admin(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/groups', [
            'name' => 'Rescue Crew',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Rescue Crew')
            ->assertJsonPath('data.viewer_role', GroupRole::ADMIN->value)
            ->assertJsonPath('data.member_count', 1);

        $groupId = (int) $response->json('data.id');

        $this->assertDatabaseHas('groups', [
            'id' => $groupId,
            'name' => 'Rescue Crew',
            'created_by_user_id' => $user->id,
        ]);
        $this->assertDatabaseHas('group_memberships', [
            'group_id' => $groupId,
            'user_id' => $user->id,
            'role' => GroupRole::ADMIN->value,
            'end_at' => null,
        ]);
    }

    #[Test]
    public function create_group_with_pet_ids_assigns_atomically(): void
    {
        $owner = User::factory()->create();
        $petA = $this->createPetWithOwner($owner);
        $petB = $this->createPetWithOwner($owner);
        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/groups', [
            'name' => 'With Pets',
            'pet_ids' => [$petA->id, $petB->id],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.pet_count', 2);

        $groupId = (int) $response->json('data.id');

        $this->assertDatabaseHas('group_pets', [
            'group_id' => $groupId,
            'pet_id' => $petA->id,
            'end_at' => null,
        ]);
        $this->assertDatabaseHas('group_pets', [
            'group_id' => $groupId,
            'pet_id' => $petB->id,
            'end_at' => null,
        ]);
    }

    #[Test]
    public function create_group_rejects_pet_ids_when_not_owner(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        Sanctum::actingAs($other);

        $response = $this->postJson('/api/groups', [
            'name' => 'Stolen Pets',
            'pet_ids' => [$pet->id],
        ]);

        $response->assertForbidden();
        $this->assertDatabaseMissing('groups', ['name' => 'Stolen Pets']);
        $this->assertDatabaseCount('group_pets', 0);
    }

    #[Test]
    public function admin_can_update_and_delete_group(): void
    {
        $admin = User::factory()->create();
        $group = $this->makeGroupWithAdmin($admin);
        Sanctum::actingAs($admin);

        $this->putJson("/api/groups/{$group->id}", ['name' => 'Renamed'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Renamed');

        $this->assertDatabaseHas('groups', [
            'id' => $group->id,
            'name' => 'Renamed',
        ]);

        $this->deleteJson("/api/groups/{$group->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('groups', ['id' => $group->id]);
    }

    #[Test]
    public function member_cannot_update_or_delete_group(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroupWithAdmin($admin);
        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $admin->id,
        ]);

        Sanctum::actingAs($member);

        $this->putJson("/api/groups/{$group->id}", ['name' => 'Nope'])
            ->assertForbidden();

        $this->deleteJson("/api/groups/{$group->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('groups', [
            'id' => $group->id,
            'name' => $group->name,
            'deleted_at' => null,
        ]);
    }

    #[Test]
    public function super_admin_role_does_not_bypass_group_membership_for_main_app_reads(): void
    {
        $admin = User::factory()->create();
        $superAdmin = User::factory()->create();
        $group = $this->makeGroupWithAdmin($admin);
        Role::findOrCreate('super_admin', 'web');
        $superAdmin->assignRole('super_admin');

        Sanctum::actingAs($superAdmin);

        $this->getJson("/api/groups/{$group->id}")->assertForbidden();
        $this->getJson("/api/groups/{$group->id}/members")->assertForbidden();
        $this->getJson("/api/groups/{$group->id}/pets")->assertForbidden();
    }

    #[Test]
    public function delete_soft_deletes_and_ends_memberships_assignments_and_revokes_invitations(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroupWithAdmin($admin);
        $pet = $this->createPetWithOwner($admin);

        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $admin->id,
        ]);
        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $pet->id,
            'added_by_user_id' => $admin->id,
        ]);

        $invitation = ResourceInvitation::query()->create([
            'type' => ResourceInvitationType::GROUP,
            'token' => ResourceInvitation::generateUniqueToken(),
            'invited_by_user_id' => $admin->id,
            'status' => ResourceInvitationStatus::PENDING,
            'expires_at' => now()->addDay(),
        ]);
        GroupResourceInvitation::query()->create([
            'resource_invitation_id' => $invitation->id,
            'group_id' => $group->id,
            'role' => GroupRole::MEMBER,
        ]);

        Sanctum::actingAs($admin);

        $this->deleteJson("/api/groups/{$group->id}")->assertNoContent();

        $this->assertSoftDeleted('groups', ['id' => $group->id]);
        $this->assertDatabaseMissing('group_memberships', [
            'group_id' => $group->id,
            'end_at' => null,
        ]);
        $this->assertDatabaseMissing('group_pets', [
            'group_id' => $group->id,
            'end_at' => null,
        ]);
        $this->assertDatabaseHas('resource_invitations', [
            'id' => $invitation->id,
            'status' => ResourceInvitationStatus::REVOKED->value,
        ]);
    }

    private function makeGroupWithAdmin(User $admin, string $name = 'Test Group'): Group
    {
        $group = Group::factory()->create([
            'name' => $name,
            'created_by_user_id' => $admin->id,
        ]);

        GroupMembership::factory()->admin()->active()->create([
            'group_id' => $group->id,
            'user_id' => $admin->id,
        ]);

        return $group;
    }
}
