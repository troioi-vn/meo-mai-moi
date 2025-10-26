<?php

namespace App\Policies;

use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PlacementRequestPolicy
{
    use HandlesAuthorization;

    private function isAdmin(User $user): bool
    {
        return method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
    }

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, PlacementRequest $placementRequest): bool
    {
        return $this->isAdmin($user) || $placementRequest->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, PlacementRequest $placementRequest): bool
    {
        return $this->isAdmin($user) || $placementRequest->user_id === $user->id;
    }

    public function delete(User $user, PlacementRequest $placementRequest): bool
    {
        return $this->isAdmin($user) || $placementRequest->user_id === $user->id;
    }

    // Custom abilities for owner actions
    public function confirm(User $user, PlacementRequest $placementRequest): bool
    {
        return $this->isAdmin($user) || $placementRequest->user_id === $user->id;
    }

    public function reject(User $user, PlacementRequest $placementRequest): bool
    {
        return $this->isAdmin($user) || $placementRequest->user_id === $user->id;
    }

    // Admin-only for bulk/advanced actions
    public function deleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDelete(User $user, PlacementRequest $placementRequest): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDeleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function restore(User $user, PlacementRequest $placementRequest): bool
    {
        return $this->isAdmin($user);
    }

    public function restoreAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function replicate(User $user, PlacementRequest $placementRequest): bool
    {
        return $this->isAdmin($user);
    }

    public function reorder(User $user): bool
    {
        return $this->isAdmin($user);
    }
}
