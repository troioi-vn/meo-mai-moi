<?php

declare(strict_types=1);

namespace Tests\Feature\Group;

use App\Enums\GroupRole;
use App\Enums\ResourceInvitationStatus;
use App\Enums\ResourceInvitationType;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class GroupMembershipTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function last_admin_cannot_leave_remove_or_demote(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroupWithAdmin($admin);
        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/groups/{$group->id}/leave")
            ->assertUnprocessable()
            ->assertJsonPath('message', __('groups.last_admin_required'));

        $this->deleteJson("/api/groups/{$group->id}/members/{$admin->id}")
            ->assertUnprocessable()
            ->assertJsonPath('message', __('groups.last_admin_required'));

        $this->putJson("/api/groups/{$group->id}/members/{$admin->id}", [
            'role' => GroupRole::MEMBER->value,
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', __('groups.last_admin_required'));

        $this->assertDatabaseHas('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $admin->id,
            'role' => GroupRole::ADMIN->value,
            'end_at' => null,
        ]);
    }

    #[Test]
    public function second_admin_can_promote_demote_and_remove(): void
    {
        $admin = User::factory()->create();
        $otherAdmin = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroupWithAdmin($admin);

        GroupMembership::factory()->admin()->active()->create([
            'group_id' => $group->id,
            'user_id' => $otherAdmin->id,
            'invited_by_user_id' => $admin->id,
        ]);
        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        $this->putJson("/api/groups/{$group->id}/members/{$member->id}", [
            'role' => GroupRole::ADMIN->value,
        ])
            ->assertOk()
            ->assertJsonPath('data.role', GroupRole::ADMIN->value);

        $this->putJson("/api/groups/{$group->id}/members/{$otherAdmin->id}", [
            'role' => GroupRole::MEMBER->value,
        ])
            ->assertOk()
            ->assertJsonPath('data.role', GroupRole::MEMBER->value);

        $this->deleteJson("/api/groups/{$group->id}/members/{$otherAdmin->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $otherAdmin->id,
            'end_at' => null,
        ]);
        $this->assertDatabaseHas('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $member->id,
            'role' => GroupRole::ADMIN->value,
            'end_at' => null,
        ]);
    }

    #[Test]
    public function member_can_leave_group(): void
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

        $this->postJson("/api/groups/{$group->id}/leave")->assertNoContent();

        $this->assertDatabaseMissing('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $member->id,
            'end_at' => null,
        ]);
    }

    #[Test]
    public function group_invitation_create_list_revoke_and_accept(): void
    {
        $admin = User::factory()->create();
        $invitee = User::factory()->create();
        $group = $this->makeGroupWithAdmin($admin);

        Sanctum::actingAs($admin);

        $create = $this->postJson("/api/groups/{$group->id}/invitations", [
            'role' => GroupRole::MEMBER->value,
        ]);

        $create->assertCreated()
            ->assertJsonPath('data.invitation.type', ResourceInvitationType::GROUP->value)
            ->assertJsonPath('data.invitation.role', GroupRole::MEMBER->value)
            ->assertJsonPath('data.invitation.status', ResourceInvitationStatus::PENDING->value)
            ->assertJsonPath('data.invitation.group_id', $group->id);

        $invitationId = (int) $create->json('data.invitation.id');
        $token = (string) $create->json('data.invitation.token');
        $this->assertNotEmpty($token);
        $this->assertStringContainsString('/invite/', (string) $create->json('data.invitation_url'));

        $list = $this->getJson("/api/groups/{$group->id}/invitations");
        $list->assertOk();
        $this->assertCount(1, $list->json('data'));
        $this->assertSame($invitationId, (int) $list->json('data.0.id'));

        // Revoke path: create a second invitation and revoke it.
        $second = $this->postJson("/api/groups/{$group->id}/invitations", [
            'role' => GroupRole::ADMIN->value,
        ])->assertCreated();
        $secondId = (int) $second->json('data.invitation.id');

        $this->deleteJson("/api/groups/{$group->id}/invitations/{$secondId}")
            ->assertNoContent();

        $this->assertDatabaseHas('resource_invitations', [
            'id' => $secondId,
            'status' => ResourceInvitationStatus::REVOKED->value,
        ]);

        Sanctum::actingAs($invitee);

        $this->postJson("/api/resource-invitations/{$token}/accept")
            ->assertOk()
            ->assertJsonPath('data.type', ResourceInvitationType::GROUP->value)
            ->assertJsonPath('data.group_id', $group->id)
            ->assertJsonPath('data.role', GroupRole::MEMBER->value);

        $this->assertDatabaseHas('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $invitee->id,
            'role' => GroupRole::MEMBER->value,
            'end_at' => null,
        ]);
        $this->assertDatabaseHas('resource_invitations', [
            'id' => $invitationId,
            'status' => ResourceInvitationStatus::ACCEPTED->value,
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
