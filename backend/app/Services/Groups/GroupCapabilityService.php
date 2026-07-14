<?php

declare(strict_types=1);

namespace App\Services\Groups;

use App\Enums\GroupRole;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\User;

/**
 * Centralized Group capability checks for current and future roles.
 */
class GroupCapabilityService
{
    public function activeMembership(User $user, Group $group): ?GroupMembership
    {
        if ($group->trashed()) {
            return null;
        }

        /** @var GroupMembership|null $membership */
        $membership = GroupMembership::query()
            ->where('group_id', $group->id)
            ->where('user_id', $user->id)
            ->active()
            ->first();

        return $membership;
    }

    public function isActiveMember(User $user, Group $group): bool
    {
        return $this->activeMembership($user, $group) !== null;
    }

    public function isActiveAdmin(User $user, Group $group): bool
    {
        $membership = $this->activeMembership($user, $group);

        return $membership !== null && $membership->isAdmin();
    }

    public function canView(User $user, Group $group): bool
    {
        return $this->isActiveMember($user, $group);
    }

    public function canManage(User $user, Group $group): bool
    {
        return $this->isActiveAdmin($user, $group);
    }

    public function canEditGroupPets(User $user, Group $group): bool
    {
        $membership = $this->activeMembership($user, $group);

        return $membership !== null && $membership->role->canEditPets();
    }

    public function roleFor(User $user, Group $group): ?GroupRole
    {
        return $this->activeMembership($user, $group)?->role;
    }
}
