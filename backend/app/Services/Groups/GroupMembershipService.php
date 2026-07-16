<?php

declare(strict_types=1);

namespace App\Services\Groups;

use App\Enums\GroupRole;
use App\Enums\ResourceInvitationType;
use App\Exceptions\GroupException;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\User;
use App\Services\ResourceInvitationService;
use Illuminate\Support\Facades\DB;

class GroupMembershipService
{
    public function __construct(
        private readonly GroupCapabilityService $capabilities,
    ) {}

    public function addMember(
        Group $group,
        User $user,
        GroupRole $role,
        ?User $invitedBy = null,
    ): GroupMembership {
        return DB::transaction(function () use ($group, $user, $role, $invitedBy): GroupMembership {
            $this->lockGroup($group);

            $existing = GroupMembership::query()
                ->where('group_id', $group->id)
                ->where('user_id', $user->id)
                ->active()
                ->first();

            if ($existing !== null) {
                throw GroupException::alreadyAMember();
            }

            return GroupMembership::query()->create([
                'group_id' => $group->id,
                'user_id' => $user->id,
                'role' => $role,
                'invited_by_user_id' => $invitedBy?->id,
                'start_at' => now(),
                'end_at' => null,
            ]);
        });
    }

    public function updateRole(Group $group, User $targetUser, GroupRole $newRole, User $actor): GroupMembership
    {
        return DB::transaction(function () use ($group, $targetUser, $newRole, $actor): GroupMembership {
            $this->lockGroup($group);

            if (! $this->capabilities->isActiveAdmin($actor, $group)) {
                throw GroupException::notGroupAdmin();
            }

            /** @var GroupMembership $membership */
            $membership = GroupMembership::query()
                ->where('group_id', $group->id)
                ->where('user_id', $targetUser->id)
                ->active()
                ->lockForUpdate()
                ->first() ?? throw GroupException::notAMember();

            if ($membership->isAdmin() && $newRole !== GroupRole::ADMIN) {
                $this->assertNotLastAdmin($group);
            }

            $previousWasAdmin = $membership->isAdmin();
            $membership->update(['role' => $newRole]);

            if ($previousWasAdmin && $newRole !== GroupRole::ADMIN) {
                $this->revokeInvitationsIssuedBy($targetUser, $group);
            }

            return $membership->fresh() ?? $membership;
        });
    }

    public function removeMember(Group $group, User $targetUser, User $actor): void
    {
        $this->removeMemberWithOptionalActorAuthorization($group, $targetUser, $actor);
    }

    /**
     * Moderator entry point. The caller must authorize the moderator.
     */
    public function removeMemberAsModerator(Group $group, User $targetUser): void
    {
        $this->removeMemberWithOptionalActorAuthorization($group, $targetUser);
    }

    public function leave(Group $group, User $user): void
    {
        DB::transaction(function () use ($group, $user): void {
            $this->lockGroup($group);

            /** @var GroupMembership $membership */
            $membership = GroupMembership::query()
                ->where('group_id', $group->id)
                ->where('user_id', $user->id)
                ->active()
                ->lockForUpdate()
                ->first() ?? throw GroupException::notAMember();

            if ($membership->isAdmin()) {
                $this->assertNotLastAdmin($group);
            }

            $wasAdmin = $membership->isAdmin();
            $membership->update(['end_at' => now()]);

            if ($wasAdmin) {
                $this->revokeInvitationsIssuedBy($user, $group);
            }
        });
    }

    public function endAllActiveMemberships(Group $group): void
    {
        GroupMembership::query()
            ->where('group_id', $group->id)
            ->active()
            ->update(['end_at' => now()]);
    }

    private function lockGroup(Group $group): void
    {
        Group::query()->whereKey($group->id)->lockForUpdate()->firstOrFail();
    }

    private function removeMemberWithOptionalActorAuthorization(
        Group $group,
        User $targetUser,
        ?User $actor = null,
    ): void {
        DB::transaction(function () use ($group, $targetUser, $actor): void {
            $this->lockGroup($group);

            if ($actor !== null && ! $this->capabilities->isActiveAdmin($actor, $group)) {
                throw GroupException::notGroupAdmin();
            }

            /** @var GroupMembership $membership */
            $membership = GroupMembership::query()
                ->where('group_id', $group->id)
                ->where('user_id', $targetUser->id)
                ->active()
                ->lockForUpdate()
                ->first() ?? throw GroupException::notAMember();

            if ($membership->isAdmin()) {
                $this->assertNotLastAdmin($group);
            }

            $wasAdmin = $membership->isAdmin();
            $membership->update(['end_at' => now()]);

            if ($wasAdmin) {
                $this->revokeInvitationsIssuedBy($targetUser, $group);
            }
        });
    }

    private function assertNotLastAdmin(Group $group): void
    {
        $adminCount = GroupMembership::query()
            ->where('group_id', $group->id)
            ->active()
            ->admins()
            ->count();

        if ($adminCount <= 1) {
            throw GroupException::lastAdminRequired();
        }
    }

    private function revokeInvitationsIssuedBy(User $inviter, Group $group): void
    {
        app(ResourceInvitationService::class)->revokePendingIssuedByForTarget(
            ResourceInvitationType::GROUP,
            $inviter,
            $group
        );
    }
}
