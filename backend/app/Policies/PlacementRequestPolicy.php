<?php

namespace App\Policies;

use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PlacementRequestPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, PlacementRequest $placementRequest): bool
    {
        return $this->isAdmin($user) || $placementRequest->pet->isOwnedBy($user);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, PlacementRequest $placementRequest): bool
    {
        return $this->isAdmin($user) || $placementRequest->pet->isOwnedBy($user);
    }

    public function delete(User $user, PlacementRequest $placementRequest): bool
    {
        return $this->isAdmin($user) || $placementRequest->pet->isOwnedBy($user);
    }

    // Custom abilities for owner actions
    public function confirm(User $user, PlacementRequest $placementRequest): bool
    {
        return $this->isAdmin($user) || $placementRequest->pet->isOwnedBy($user);
    }

    public function reject(User $user, PlacementRequest $placementRequest): bool
    {
        return $this->isAdmin($user) || $placementRequest->pet->isOwnedBy($user);
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

    private function isAdmin(User $user): bool
    {
        return method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
    }
}
