<?php

declare(strict_types=1);

namespace Tests\Unit\Groups;

use App\Enums\GroupRole;
use App\Exceptions\GroupException;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\User;
use App\Services\Groups\GroupMembershipService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class GroupMembershipServiceTest extends TestCase
{
    use RefreshDatabase;

    private GroupMembershipService $memberships;

    protected function setUp(): void
    {
        parent::setUp();
        $this->memberships = app(GroupMembershipService::class);
    }

    #[Test]
    public function last_admin_invariant_blocks_leave_remove_and_demote(): void
    {
        $admin = User::factory()->create();
        $group = Group::factory()->create(['created_by_user_id' => $admin->id]);
        GroupMembership::factory()->admin()->active()->create([
            'group_id' => $group->id,
            'user_id' => $admin->id,
        ]);

        try {
            $this->memberships->leave($group, $admin);
            $this->fail('Expected GroupException for leave');
        } catch (GroupException $e) {
            $this->assertSame('last_admin_required', $e->getMessage());
        }

        try {
            $this->memberships->removeMember($group, $admin, $admin);
            $this->fail('Expected GroupException for remove');
        } catch (GroupException $e) {
            $this->assertSame('last_admin_required', $e->getMessage());
        }

        try {
            $this->memberships->updateRole($group, $admin, GroupRole::MEMBER, $admin);
            $this->fail('Expected GroupException for demote');
        } catch (GroupException $e) {
            $this->assertSame('last_admin_required', $e->getMessage());
        }

        $this->assertDatabaseHas('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $admin->id,
            'role' => GroupRole::ADMIN->value,
            'end_at' => null,
        ]);
    }

    #[Test]
    public function second_admin_can_leave_after_promoting_another(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $group = Group::factory()->create(['created_by_user_id' => $admin->id]);
        GroupMembership::factory()->admin()->active()->create([
            'group_id' => $group->id,
            'user_id' => $admin->id,
        ]);
        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $admin->id,
        ]);

        $this->memberships->updateRole($group, $member, GroupRole::ADMIN, $admin);
        $this->memberships->leave($group, $admin);

        $this->assertDatabaseMissing('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $admin->id,
            'end_at' => null,
        ]);
        $this->assertDatabaseHas('group_memberships', [
            'group_id' => $group->id,
            'user_id' => $member->id,
            'role' => GroupRole::ADMIN->value,
            'end_at' => null,
        ]);
    }
}
