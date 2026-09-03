<?php

declare(strict_types=1);

namespace Tests\Feature\Filament;

use App\Enums\ChatType;
use App\Enums\ChatUserRole;
use App\Enums\ContextableType;
use App\Enums\GroupRole;
use App\Enums\LedgerPetAssignmentSource;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\ResourceInvitationStatus;
use App\Enums\ResourceInvitationType;
use App\Exceptions\GroupException;
use App\Filament\Resources\GroupResource\Pages\ViewGroup;
use App\Filament\Resources\GroupResource\RelationManagers\InvitationsRelationManager;
use App\Filament\Resources\GroupResource\RelationManagers\MembershipsRelationManager;
use App\Filament\Resources\GroupResource\RelationManagers\PetsRelationManager;
use App\Models\Chat;
use App\Models\ChatUser;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\GroupResourceInvitation;
use App\Models\Ledger;
use App\Models\LedgerPetAssignment;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\ResourceInvitation;
use App\Models\User;
use App\Services\Groups\GroupMembershipService;
use App\Services\Groups\GroupPetService;
use App\Services\Groups\GroupService;
use App\Services\ResourceInvitationService;
use Carbon\CarbonInterface;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use RuntimeException;
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

    public function test_invitation_revoke_action_shows_only_for_pending_unexpired(): void
    {
        $owner = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner);

        $pending = $this->makeGroupInvitation($group, $owner, ResourceInvitationStatus::PENDING, now()->addDay());
        $accepted = $this->makeGroupInvitation($group, $owner, ResourceInvitationStatus::ACCEPTED, now()->addDay());
        $revoked = $this->makeGroupInvitation($group, $owner, ResourceInvitationStatus::REVOKED, now()->addDay());
        $expired = $this->makeGroupInvitation($group, $owner, ResourceInvitationStatus::PENDING, now()->subHour());

        Livewire::test(InvitationsRelationManager::class, [
            'ownerRecord' => $group,
            'pageClass' => ViewGroup::class,
        ])
            ->assertTableActionVisible('revoke', $pending->getKey())
            ->assertTableActionHidden('revoke', $accepted->getKey())
            ->assertTableActionHidden('revoke', $revoked->getKey())
            ->assertTableActionHidden('revoke', $expired->getKey());
    }

    public function test_admin_can_revoke_group_invitation_from_relation_manager(): void
    {
        $owner = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner);
        $detail = $this->makeGroupInvitation($group, $owner, ResourceInvitationStatus::PENDING, now()->addDay());

        Livewire::test(InvitationsRelationManager::class, [
            'ownerRecord' => $group,
            'pageClass' => ViewGroup::class,
        ])
            ->callTableAction('revoke', $detail)
            ->assertNotified('Resource invitation revoked');

        $this->assertSame(ResourceInvitationStatus::REVOKED, ResourceInvitation::findOrFail($detail->getKey())->status);
        $this->assertNotNull(ResourceInvitation::findOrFail($detail->getKey())->revoked_at);

        // Neither the parent invitation nor the group detail row is deleted.
        $this->assertDatabaseHas('resource_invitations', [
            'id' => $detail->getKey(),
            'status' => ResourceInvitationStatus::REVOKED->value,
        ]);
        $this->assertDatabaseHas('group_resource_invitations', [
            'resource_invitation_id' => $detail->getKey(),
            'group_id' => $group->id,
        ]);
    }

    public function test_revoking_an_already_resolved_invitation_reports_not_revocable(): void
    {
        $owner = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner);
        $detail = $this->makeGroupInvitation($group, $owner, ResourceInvitationStatus::PENDING, now()->addDay());

        // Simulate losing a revocation race: the row still looks revocable,
        // but the service reports it is no longer valid by the time it runs.
        app()->instance(ResourceInvitationService::class, new class extends ResourceInvitationService
        {
            public function __construct() {}

            public function revoke(ResourceInvitation $invitation): void
            {
                throw new RuntimeException('no_longer_valid');
            }
        });

        Livewire::test(InvitationsRelationManager::class, [
            'ownerRecord' => $group,
            'pageClass' => ViewGroup::class,
        ])
            ->callTableAction('revoke', $detail)
            ->assertNotified('Invitation is no longer revocable');

        $this->assertSame(ResourceInvitationStatus::PENDING, ResourceInvitation::findOrFail($detail->getKey())->status);
        $this->assertDatabaseHas('group_resource_invitations', [
            'resource_invitation_id' => $detail->getKey(),
            'group_id' => $group->id,
        ]);
    }

    public function test_end_assignment_action_shows_only_for_active_assignments(): void
    {
        $owner = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner);

        $active = GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $this->createPetWithOwner($owner)->id,
            'added_by_user_id' => $owner->id,
        ]);
        $ended = GroupPet::factory()->ended()->create([
            'group_id' => $group->id,
            'pet_id' => $this->createPetWithOwner($owner)->id,
            'added_by_user_id' => $owner->id,
        ]);

        Livewire::test(PetsRelationManager::class, [
            'ownerRecord' => $group,
            'pageClass' => ViewGroup::class,
        ])
            ->assertTableActionVisible('end_assignment', $active->getKey())
            ->assertTableActionHidden('end_assignment', $ended->getKey());
    }

    public function test_admin_can_end_pet_assignment_with_ledger_sync(): void
    {
        $this->seed(CurrencySeeder::class);

        $owner = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner);
        $pet = $this->createPetWithOwner($owner);
        $assignment = GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $pet->id,
            'added_by_user_id' => $owner->id,
        ]);
        $ledger = Ledger::query()->create([
            'title' => 'Rescue ledger',
            'currency_code' => 'VND',
            'group_id' => $group->id,
            'sync_group_pets' => true,
            'created_by_user_id' => $owner->id,
        ]);
        $ledgerAssignment = LedgerPetAssignment::query()->create([
            'ledger_id' => $ledger->id,
            'pet_id' => $pet->id,
            'source' => LedgerPetAssignmentSource::GROUP_SYNC,
            'source_group_id' => $group->id,
            'start_at' => now(),
        ]);

        Livewire::test(PetsRelationManager::class, [
            'ownerRecord' => $group,
            'pageClass' => ViewGroup::class,
        ])
            ->callTableAction('end_assignment', $assignment)
            ->assertNotified('Pet assignment ended');

        // The assignment row is preserved with end_at; the pet row is kept.
        $this->assertNotNull($assignment->fresh()->end_at);
        $this->assertNotNull(Pet::find($pet->id));

        // The existing ledger synchronization still runs on detach.
        $this->assertNotNull($ledgerAssignment->fresh()->end_at);
    }

    public function test_end_assignment_is_refused_while_placement_is_live(): void
    {
        foreach ([PlacementRequestStatus::OPEN, PlacementRequestStatus::PENDING_TRANSFER] as $status) {
            $owner = User::factory()->create();
            $group = $this->makeGroupWithAdmin($owner);
            $pet = $this->createPetWithOwner($owner);
            $assignment = GroupPet::factory()->active()->create([
                'group_id' => $group->id,
                'pet_id' => $pet->id,
                'added_by_user_id' => $owner->id,
            ]);
            PlacementRequest::factory()->create([
                'pet_id' => $pet->id,
                'user_id' => $owner->id,
                'request_type' => PlacementRequestType::PERMANENT,
                'status' => $status,
                'start_date' => now()->addDay(),
            ]);

            Livewire::test(PetsRelationManager::class, [
                'ownerRecord' => $group,
                'pageClass' => ViewGroup::class,
            ])
                ->callTableAction('end_assignment', $assignment)
                ->assertNotified('Pet assignment could not be ended');

            $this->assertNull($assignment->fresh()->end_at, "assignment must stay active while a {$status->value} placement is live");
            $this->assertNotNull(Pet::find($pet->id));
        }
    }

    public function test_remove_pet_as_moderator_bypasses_actor_but_keeps_guards(): void
    {
        $owner = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner);
        $pet = $this->createPetWithOwner($owner);
        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $pet->id,
            'added_by_user_id' => $owner->id,
        ]);

        // No actor at all: the moderator path detaches without admin/owner checks.
        app(GroupPetService::class)->removePetAsModerator($group, $pet);

        $this->assertNotNull(GroupPet::query()->where('group_id', $group->id)->where('pet_id', $pet->id)->sole()->end_at);
        $this->assertNotNull(Pet::find($pet->id));

        // The regular user path still requires an admin who directly owns the pet.
        $stranger = User::factory()->create();
        $otherPet = $this->createPetWithOwner($owner);
        $otherGroup = $this->makeGroupWithAdmin($owner, 'Other Group');
        GroupPet::factory()->active()->create([
            'group_id' => $otherGroup->id,
            'pet_id' => $otherPet->id,
            'added_by_user_id' => $owner->id,
        ]);

        try {
            app(GroupPetService::class)->removePet($otherGroup, $otherPet, $stranger);
            $this->fail('Expected GroupException for a non-admin actor');
        } catch (GroupException $e) {
            $this->assertSame('not_group_admin', $e->getMessage());
        }

        $this->assertNull(GroupPet::query()->where('group_id', $otherGroup->id)->where('pet_id', $otherPet->id)->sole()->end_at);
    }

    private function makeGroupInvitation(
        Group $group,
        User $inviter,
        ResourceInvitationStatus $status,
        CarbonInterface $expiresAt,
    ): GroupResourceInvitation {
        $invitation = ResourceInvitation::query()->create([
            'type' => ResourceInvitationType::GROUP,
            'token' => ResourceInvitation::generateUniqueToken(),
            'invited_by_user_id' => $inviter->id,
            'status' => $status,
            'expires_at' => $expiresAt,
        ]);

        return GroupResourceInvitation::query()->create([
            'resource_invitation_id' => $invitation->id,
            'group_id' => $group->id,
            'role' => GroupRole::MEMBER,
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
