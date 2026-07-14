<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\GroupRole;
use App\Enums\PetRelationshipType;
use App\Enums\PetStatus;
use App\Enums\PlacementRequestStatus;
use App\Enums\TransferRequestStatus;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\PlacementRequest;
use App\Models\TransferRequest;
use App\Models\User;
use App\Services\PetAccessService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class PetAccessServiceTest extends TestCase
{
    use RefreshDatabase;

    private PetAccessService $access;

    protected function setUp(): void
    {
        parent::setUp();
        $this->access = new PetAccessService;
    }

    #[Test]
    public function owner_has_full_direct_access(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $this->assertTrue($this->access->canView($owner, $pet));
        $this->assertTrue($this->access->canEdit($owner, $pet));
        $this->assertTrue($this->access->isDirectOwner($owner, $pet));
        $this->assertTrue($this->access->canManagePeople($owner, $pet));
        $this->assertTrue($this->access->canDelete($owner, $pet));
        $this->assertTrue($this->access->canTransferOwnership($owner, $pet));

        $permissions = $this->access->viewerPermissions($owner, $pet);
        $this->assertTrue($permissions['can_edit']);
        $this->assertTrue($permissions['can_delete']);
        $this->assertTrue($permissions['can_manage_people']);
        $this->assertTrue($permissions['can_transfer_ownership']);
        $this->assertFalse($permissions['can_view_contact']);
        $this->assertTrue($permissions['is_owner']);
        $this->assertFalse($permissions['is_editor']);
        $this->assertSame([['type' => 'relationship', 'role' => 'owner']], $permissions['access_sources']);
    }

    #[Test]
    public function editor_can_view_and_edit_but_not_manage_people(): void
    {
        $owner = User::factory()->create();
        $editor = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        PetRelationship::factory()->editor()->active()->create([
            'user_id' => $editor->id,
            'pet_id' => $pet->id,
            'created_by' => $owner->id,
        ]);

        $this->assertTrue($this->access->canView($editor, $pet));
        $this->assertTrue($this->access->canEdit($editor, $pet));
        $this->assertFalse($this->access->isDirectOwner($editor, $pet));
        $this->assertFalse($this->access->canManagePeople($editor, $pet));
        $this->assertFalse($this->access->canDelete($editor, $pet));

        $permissions = $this->access->viewerPermissions($editor, $pet);
        $this->assertTrue($permissions['can_edit']);
        $this->assertTrue($permissions['is_editor']);
        $this->assertFalse($permissions['is_owner']);
        $this->assertTrue($permissions['can_view_contact']);
    }

    #[Test]
    public function viewer_can_view_only(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        PetRelationship::factory()->viewer()->active()->create([
            'user_id' => $viewer->id,
            'pet_id' => $pet->id,
            'created_by' => $owner->id,
        ]);

        $this->assertTrue($this->access->canView($viewer, $pet));
        $this->assertFalse($this->access->canEdit($viewer, $pet));

        $permissions = $this->access->viewerPermissions($viewer, $pet);
        $this->assertFalse($permissions['can_edit']);
        $this->assertTrue($permissions['is_viewer']);
    }

    #[Test]
    public function foster_and_sitter_have_view_only_access(): void
    {
        $owner = User::factory()->create();
        $foster = User::factory()->create();
        $sitter = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        PetRelationship::factory()->foster()->active()->create([
            'user_id' => $foster->id,
            'pet_id' => $pet->id,
            'created_by' => $owner->id,
        ]);

        PetRelationship::factory()->active()->create([
            'user_id' => $sitter->id,
            'pet_id' => $pet->id,
            'relationship_type' => PetRelationshipType::SITTER,
            'created_by' => $owner->id,
        ]);

        $this->assertTrue($this->access->canView($foster, $pet));
        $this->assertFalse($this->access->canEdit($foster, $pet));
        $this->assertTrue($this->access->viewerPermissions($foster, $pet)['is_foster']);

        $this->assertTrue($this->access->canView($sitter, $pet));
        $this->assertFalse($this->access->canEdit($sitter, $pet));
        $this->assertTrue($this->access->viewerPermissions($sitter, $pet)['is_sitter']);
    }

    #[Test]
    public function concurrent_relationships_return_all_access_sources(): void
    {
        $user = User::factory()->create();
        $creator = User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $creator->id]);

        PetRelationship::factory()->owner()->active()->create([
            'user_id' => $user->id,
            'pet_id' => $pet->id,
            'created_by' => $creator->id,
        ]);
        PetRelationship::factory()->editor()->active()->create([
            'user_id' => $user->id,
            'pet_id' => $pet->id,
            'created_by' => $creator->id,
        ]);

        $sources = $this->access->accessSources($user, $pet);
        $roles = collect($sources)->pluck('role')->sort()->values()->all();

        $this->assertSame(['editor', 'owner'], $roles);

        $permissions = $this->access->viewerPermissions($user, $pet);
        $this->assertTrue($permissions['is_owner']);
        $this->assertTrue($permissions['is_editor']);
    }

    #[Test]
    public function ended_relationships_do_not_grant_access(): void
    {
        $owner = User::factory()->create();
        $formerEditor = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        PetRelationship::factory()->editor()->create([
            'user_id' => $formerEditor->id,
            'pet_id' => $pet->id,
            'created_by' => $owner->id,
            'end_at' => now()->subDay(),
        ]);

        $this->assertFalse($this->access->canView($formerEditor, $pet));
        $this->assertFalse($this->access->canEdit($formerEditor, $pet));
        $this->assertSame([], $this->access->accessSources($formerEditor, $pet));
    }

    #[Test]
    public function public_placement_and_lost_pets_are_viewable_without_edit(): void
    {
        $stranger = User::factory()->create();
        $lostPet = Pet::factory()->create(['status' => PetStatus::LOST]);
        $placementPet = Pet::factory()->create();
        PlacementRequest::factory()->create([
            'pet_id' => $placementPet->id,
            'status' => PlacementRequestStatus::OPEN,
        ]);

        $this->assertTrue($this->access->canView(null, $lostPet));
        $this->assertTrue($this->access->canView($stranger, $lostPet));
        $this->assertFalse($this->access->canEdit($stranger, $lostPet));

        $this->assertTrue($this->access->canView(null, $placementPet));
        $this->assertTrue($this->access->canView($stranger, $placementPet));
        $this->assertFalse($this->access->canEdit($stranger, $placementPet));
    }

    #[Test]
    public function pending_transfer_recipient_can_view_but_not_edit(): void
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $placement = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::PENDING_TRANSFER,
        ]);

        TransferRequest::factory()->create([
            'placement_request_id' => $placement->id,
            'to_user_id' => $helper->id,
            'status' => TransferRequestStatus::PENDING,
        ]);

        $this->assertTrue($this->access->canView($helper, $pet));
        $this->assertFalse($this->access->canEdit($helper, $pet));
        $this->assertSame([], $this->access->accessSources($helper, $pet));
    }

    #[Test]
    public function admin_role_does_not_grant_main_app_pet_access(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        Role::firstOrCreate(['name' => 'admin']);
        $admin->assignRole('admin');
        $pet = $this->createPetWithOwner($owner);

        $this->assertFalse($this->access->canView($admin, $pet));
        $this->assertFalse($this->access->canEdit($admin, $pet));
        $this->assertFalse($this->access->canDelete($admin, $pet));
        $this->assertFalse($this->access->canManagePeople($admin, $pet));
    }

    #[Test]
    public function public_viewer_permissions_never_include_access_sources(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $public = $this->access->publicViewerPermissions($owner, $pet);

        $this->assertArrayHasKey('is_owner', $public);
        $this->assertArrayHasKey('is_viewer', $public);
        $this->assertArrayHasKey('has_active_relationship', $public);
        $this->assertArrayNotHasKey('access_sources', $public);
        $this->assertTrue($public['is_owner']);
        $this->assertTrue($public['has_active_relationship']);
    }

    #[Test]
    public function sections_deduplicate_by_priority_and_include_shared(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $ownedPet = $this->createPetWithOwner($user);
        // Owner previously fostered this pet — should stay in owned only.
        PetRelationship::factory()->foster()->create([
            'user_id' => $user->id,
            'pet_id' => $ownedPet->id,
            'created_by' => $other->id,
            'end_at' => now()->subMonth(),
        ]);

        $activeFoster = $this->createPetWithOwner($other);
        PetRelationship::factory()->foster()->active()->create([
            'user_id' => $user->id,
            'pet_id' => $activeFoster->id,
            'created_by' => $other->id,
        ]);

        $sharedEditor = $this->createPetWithOwner($other);
        PetRelationship::factory()->editor()->active()->create([
            'user_id' => $user->id,
            'pet_id' => $sharedEditor->id,
            'created_by' => $other->id,
        ]);

        $sharedViewer = $this->createPetWithOwner($other);
        PetRelationship::factory()->viewer()->active()->create([
            'user_id' => $user->id,
            'pet_id' => $sharedViewer->id,
            'created_by' => $other->id,
        ]);

        $sharedSitter = $this->createPetWithOwner($other);
        PetRelationship::factory()->sitter()->active()->create([
            'user_id' => $user->id,
            'pet_id' => $sharedSitter->id,
            'created_by' => $other->id,
        ]);

        $pastFoster = $this->createPetWithOwner($other);
        PetRelationship::factory()->foster()->create([
            'user_id' => $user->id,
            'pet_id' => $pastFoster->id,
            'created_by' => $other->id,
            'start_at' => now()->subWeeks(2),
            'end_at' => now()->subWeek(),
        ]);

        // Past foster that is now shared via editor → shared only, not fostering_past.
        $pastFosterNowShared = $this->createPetWithOwner($other);
        PetRelationship::factory()->foster()->create([
            'user_id' => $user->id,
            'pet_id' => $pastFosterNowShared->id,
            'created_by' => $other->id,
            'start_at' => now()->subWeeks(2),
            'end_at' => now()->subWeek(),
        ]);
        PetRelationship::factory()->editor()->active()->create([
            'user_id' => $user->id,
            'pet_id' => $pastFosterNowShared->id,
            'created_by' => $other->id,
        ]);

        $sections = $this->access->sectionsForUser($user);

        $this->assertSame([$ownedPet->id], $sections['owned']->pluck('id')->all());
        $this->assertSame([$activeFoster->id], $sections['fostering_active']->pluck('id')->all());
        $this->assertEqualsCanonicalizing(
            [$sharedEditor->id, $sharedViewer->id, $sharedSitter->id, $pastFosterNowShared->id],
            $sections['shared']->pluck('id')->all()
        );
        $this->assertSame([$pastFoster->id], $sections['fostering_past']->pluck('id')->all());

        $ownedPermissions = $sections['owned']->first()->viewer_permissions;
        $this->assertTrue($ownedPermissions['is_owner']);
        $this->assertTrue($ownedPermissions['can_edit']);

        $sharedPermissions = $sections['shared']->firstWhere('id', $sharedEditor->id)->viewer_permissions;
        $this->assertTrue($sharedPermissions['is_editor']);
        $this->assertTrue($sharedPermissions['can_edit']);

        $sitterPermissions = $sections['shared']->firstWhere('id', $sharedSitter->id)->viewer_permissions;
        $this->assertTrue($sitterPermissions['is_sitter']);
        $this->assertFalse($sitterPermissions['can_edit']);
    }

    #[Test]
    public function group_membership_grants_edit_access_and_appears_in_access_sources(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = Group::factory()->create([
            'name' => 'Access Group',
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

        $pet = $this->createPetWithOwner($owner);
        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $pet->id,
            'added_by_user_id' => $owner->id,
        ]);

        $this->assertTrue($this->access->canView($member, $pet));
        $this->assertTrue($this->access->canEdit($member, $pet));
        $this->assertFalse($this->access->canDelete($member, $pet));
        $this->assertFalse($this->access->canManagePeople($member, $pet));
        $this->assertTrue($this->access->hasGroupAccess($member, $pet));

        $permissions = $this->access->viewerPermissions($member, $pet);
        $this->assertTrue($permissions['can_edit']);
        $this->assertFalse($permissions['is_editor']);
        $this->assertFalse($permissions['can_delete']);
        $this->assertFalse($permissions['can_manage_people']);
        $this->assertSame(
            [[
                'type' => 'group',
                'id' => $group->id,
                'name' => 'Access Group',
                'role' => GroupRole::MEMBER->value,
            ]],
            $permissions['access_sources']
        );

        $public = $this->access->publicViewerPermissions($member, $pet);
        $this->assertArrayNotHasKey('access_sources', $public);
        $this->assertTrue($public['has_active_relationship']);
        $this->assertFalse($public['is_owner']);
    }

    #[Test]
    public function sections_all_includes_group_only_pets_in_shared_without_duplicating_owned(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = Group::factory()->create(['created_by_user_id' => $owner->id]);
        GroupMembership::factory()->admin()->active()->create([
            'group_id' => $group->id,
            'user_id' => $owner->id,
        ]);
        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $owner->id,
        ]);

        $ownedInGroup = $this->createPetWithOwner($member);
        $groupOnly = $this->createPetWithOwner($owner);
        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $ownedInGroup->id,
            'added_by_user_id' => $member->id,
        ]);
        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $groupOnly->id,
            'added_by_user_id' => $owner->id,
        ]);

        $sections = $this->access->sectionsForUser($member);

        $this->assertSame([$ownedInGroup->id], $sections['owned']->pluck('id')->all());
        $this->assertSame([$groupOnly->id], $sections['shared']->pluck('id')->all());
        $this->assertSame('all', $sections['context']['type']);
    }

    #[Test]
    public function sections_for_group_context_requires_membership_and_filters_pets(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $outsider = User::factory()->create();
        $group = Group::factory()->create([
            'name' => 'Context Group',
            'created_by_user_id' => $admin->id,
        ]);
        GroupMembership::factory()->admin()->active()->create([
            'group_id' => $group->id,
            'user_id' => $admin->id,
        ]);
        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $admin->id,
        ]);

        $inGroup = $this->createPetWithOwner($admin);
        $outside = $this->createPetWithOwner($admin);
        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $inGroup->id,
            'added_by_user_id' => $admin->id,
        ]);

        $sections = $this->access->sectionsForUser($member, $group->id);
        $this->assertSame('group', $sections['context']['type']);
        $this->assertSame($group->id, $sections['context']['group_id']);
        $this->assertSame('Context Group', $sections['context']['group_name']);
        $this->assertSame([$inGroup->id], $sections['shared']->pluck('id')->all());
        $this->assertNotContains($outside->id, $sections['shared']->pluck('id')->all());

        $this->expectException(HttpException::class);
        $this->access->sectionsForUser($outsider, $group->id);
    }
}
