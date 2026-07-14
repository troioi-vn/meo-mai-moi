<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Group;
use App\Models\User;
use App\Services\Groups\GroupCapabilityService;
use Illuminate\Auth\Access\HandlesAuthorization;

class GroupPolicy
{
    use HandlesAuthorization;

    public function __construct(
        private readonly GroupCapabilityService $capabilities,
    ) {}

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Group $group): bool
    {
        return $this->capabilities->canView($user, $group);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Group $group): bool
    {
        return $this->capabilities->canManage($user, $group);
    }

    public function delete(User $user, Group $group): bool
    {
        return $this->capabilities->canManage($user, $group);
    }

    public function manageMembers(User $user, Group $group): bool
    {
        return $this->capabilities->canManage($user, $group);
    }

    public function managePets(User $user, Group $group): bool
    {
        return $this->capabilities->canManage($user, $group);
    }

    public function leave(User $user, Group $group): bool
    {
        return $this->capabilities->isActiveMember($user, $group);
    }

    public function createInvitation(User $user, Group $group): bool
    {
        return $this->capabilities->canManage($user, $group);
    }

    public function viewInvitations(User $user, Group $group): bool
    {
        return $this->capabilities->canManage($user, $group);
    }

    public function revokeInvitation(User $user, Group $group): bool
    {
        return $this->capabilities->canManage($user, $group);
    }
}
