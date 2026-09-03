<?php

declare(strict_types=1);

namespace Tests\Feature\Filament;

use App\Enums\ChatType;
use App\Enums\ChatUserRole;
use App\Enums\ContextableType;
use App\Enums\GroupRole;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\ResourceInvitationStatus;
use App\Enums\ResourceInvitationType;
use App\Exceptions\GroupException;
use App\Filament\Resources\GroupResource\Pages\ViewGroup;
use App\Filament\Resources\GroupResource\RelationManagers\MembershipsRelationManager;
use App\Models\Chat;
use App\Models\ChatUser;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\GroupResourceInvitation;
use App\Models\PlacementRequest;
use App\Models\ResourceInvitation;
use App\Models\User;
use App\Services\Groups\GroupMembershipService;
use App\Services\Groups\GroupService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class GroupModerationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
        $this->actingAs($this->admin);
    }

    public function test_admin_can_rename_group_from_view_page(): void
    {
        $owner = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner, 'Old Name');

        Livewire::test(ViewGroup::class, ['record' => $group->getRouteKey()])
            ->assertSuccessful()
            ->callAction('rename_group', data: ['name' => '  New Name  '])
            ->assertHasNoActionErrors()
            ->assertNotified('Group renamed');

        // The moderator path shares the user-facing normalization: stored trimmed.
        $this->assertSame('New Name', $group->fresh()->name);
        $this->assertDatabaseHas('groups', ['id' => $group->id, 'name' => 'New Name']);
    }

    public function test_rename_rejects_empty_name_with_validation_error(): void
    {
        $owner = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner, 'Old Name');

        Livewire::test(ViewGroup::class, ['record' => $group->getRouteKey()])
            ->assertSuccessful()
            ->callAction('rename_group', data: ['name' => ''])
            ->assertHasActionErrors(['name']);

        $this->assertSame('Old Name', $group->fresh()->name);
    }

    public function test_rename_refuses_blank_name_without_data_change(): void
    {
        $owner = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner, 'Old Name');

        Livewire::test(ViewGroup::class, ['record' => $group->getRouteKey()])
            ->assertSuccessful()
            ->callAction('rename_group', data: ['name' => '   '])
            ->assertHasActionErrors(['name']);

        $this->assertSame('Old Name', $group->fresh()->name);

        // Defense in depth: the shared rename path itself refuses blank names,
        // so no caller can store one even if form validation is bypassed.
        try {
            app(GroupService::class)->updateAsModerator($group, '   ');
            $this->fail('Expected GroupException for a blank name');
        } catch (GroupException $e) {
            $this->assertSame('invalid_name', $e->getMessage());
        }

        $this->assertSame('Old Name', $group->fresh()->name);
    }

    public function test_admin_can_change_role_between_every_group_role(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner);
        $membership = GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $owner->id,
        ]);

        $component = Livewire::test(MembershipsRelationManager::class, [
            'ownerRecord' => $group,
            'pageClass' => ViewGroup::class,
        ]);

        $component->callTableAction('change_role', $membership, data: ['role' => GroupRole::ADMIN->value])
            ->assertNotified('Member role updated');

        $this->assertSame(GroupRole::ADMIN, $membership->fresh()->role);

        $component->callTableAction('change_role', $membership, data: ['role' => GroupRole::MEMBER->value])
            ->assertNotified('Member role updated');

        $this->assertSame(GroupRole::MEMBER, $membership->fresh()->role);
        $this->assertDatabaseHas('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $member->id,
            'role' => GroupRole::MEMBER->value,
            'end_at' => null,
        ]);
    }

    public function test_demotion_of_sole_admin_is_refused_without_data_change(): void
    {
        $owner = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner);
        $membership = GroupMembership::query()
            ->where('group_id', $group->id)
            ->where('user_id', $owner->id)
            ->firstOrFail();

        Livewire::test(MembershipsRelationManager::class, [
            'ownerRecord' => $group,
            'pageClass' => ViewGroup::class,
        ])
            ->callTableAction('change_role', $membership, data: ['role' => GroupRole::MEMBER->value])
            ->assertNotified('Member role could not be changed');

        $fresh = $membership->fresh();
        $this->assertSame(GroupRole::ADMIN, $fresh->role);
        $this->assertNull($fresh->end_at);
        $this->assertDatabaseHas('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $owner->id,
            'role' => GroupRole::ADMIN->value,
            'end_at' => null,
        ]);
    }

    public function test_role_action_is_hidden_for_ended_memberships(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner);
        $active = GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $owner->id,
        ]);
        $ended = GroupMembership::factory()->member()->ended()->create([
            'group_id' => $group->id,
            'user_id' => User::factory()->create()->id,
            'invited_by_user_id' => $owner->id,
            'start_at' => now()->subDays(2),
        ]);

        Livewire::test(MembershipsRelationManager::class, [
            'ownerRecord' => $group,
            'pageClass' => ViewGroup::class,
        ])
            ->assertTableActionVisible('change_role', $active->getKey())
            ->assertTableActionHidden('change_role', $ended->getKey());
    }

    public function test_ended_membership_role_change_is_rejected_without_data_change(): void
    {
        $owner = User::factory()->create();
        $leaver = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner);
        $ended = GroupMembership::factory()->member()->ended()->create([
            'group_id' => $group->id,
            'user_id' => $leaver->id,
            'invited_by_user_id' => $owner->id,
            'start_at' => now()->subDays(2),
        ]);

        try {
            app(GroupMembershipService::class)->updateRoleAsModerator($group, $leaver, GroupRole::ADMIN);
            $this->fail('Expected GroupException for an ended membership');
        } catch (GroupException $e) {
            $this->assertSame('not_a_member', $e->getMessage());
        }

        $fresh = $ended->fresh();
        $this->assertSame(GroupRole::MEMBER, $fresh->role);
        $this->assertNotNull($fresh->end_at);
    }

    public function test_demotion_revokes_pending_invitations_issued_by_demoted_admin(): void
    {
        $adminA = User::factory()->create();
        $adminB = User::factory()->create();
        $group = $this->makeGroupWithAdmin($adminA);
        GroupMembership::factory()->admin()->active()->create([
            'group_id' => $group->id,
            'user_id' => $adminB->id,
            'invited_by_user_id' => $adminA->id,
        ]);
        $membershipA = GroupMembership::query()
            ->where('group_id', $group->id)
            ->where('user_id', $adminA->id)
            ->firstOrFail();

        $invitation = ResourceInvitation::query()->create([
            'type' => ResourceInvitationType::GROUP,
            'token' => ResourceInvitation::generateUniqueToken(),
            'invited_by_user_id' => $adminA->id,
            'status' => ResourceInvitationStatus::PENDING,
            'expires_at' => now()->addDay(),
        ]);
        GroupResourceInvitation::query()->create([
            'resource_invitation_id' => $invitation->id,
            'group_id' => $group->id,
            'role' => GroupRole::MEMBER,
        ]);

        Livewire::test(MembershipsRelationManager::class, [
            'ownerRecord' => $group,
            'pageClass' => ViewGroup::class,
        ])
            ->callTableAction('change_role', $membershipA, data: ['role' => GroupRole::MEMBER->value])
            ->assertNotified('Member role updated');

        $this->assertSame(GroupRole::MEMBER, $membershipA->fresh()->role);
        $this->assertSame(
            ResourceInvitationStatus::REVOKED,
            $invitation->fresh()->status,
        );
        $this->assertDatabaseHas('resource_invitations', [
            'id' => $invitation->id,
            'status' => ResourceInvitationStatus::REVOKED->value,
        ]);
    }

    public function test_role_change_synchronizes_placement_chat_roles(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner);
        $membership = GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $owner->id,
        ]);

        $pet = $this->createPetWithOwner($owner);
        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $pet->id,
            'added_by_user_id' => $owner->id,
        ]);
        $request = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'request_type' => PlacementRequestType::PERMANENT,
            'status' => PlacementRequestStatus::OPEN,
        ]);
        $chat = Chat::factory()->create([
            'type' => ChatType::PRIVATE_GROUP,
            'contextable_type' => ContextableType::PLACEMENT_REQUEST,
            'contextable_id' => $request->id,
        ]);
        $chatUser = ChatUser::query()->create([
            'chat_id' => $chat->id,
            'user_id' => $member->id,
            'role' => ChatUserRole::MEMBER,
            'joined_at' => now(),
            'left_at' => null,
        ]);

        $component = Livewire::test(MembershipsRelationManager::class, [
            'ownerRecord' => $group,
            'pageClass' => ViewGroup::class,
        ]);

        $component->callTableAction('change_role', $membership, data: ['role' => GroupRole::ADMIN->value]);

        $this->assertSame(ChatUserRole::ADMIN, $chatUser->fresh()->role);

        $component->callTableAction('change_role', $membership, data: ['role' => GroupRole::MEMBER->value]);

        $this->assertSame(ChatUserRole::MEMBER, $chatUser->fresh()->role);
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
