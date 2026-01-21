<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\PlacementRequestResponse;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PlacementRequestResponsePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, PlacementRequestResponse $response): bool
    {
        // Helper who made the response, pet owner, or admin can view
        return $this->isAdmin($user)
            || $response->helperProfile->user_id === $user->id
            || $response->placementRequest->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        // Only users with at least one helper profile can create responses
        return method_exists($user, 'helperProfiles') && $user->helperProfiles()->exists();
    }

    public function update(User $user, PlacementRequestResponse $response): bool
    {
        // Only the helper who made the response or admin can update
        return $this->isAdmin($user)
            || $response->helperProfile->user_id === $user->id;
    }

    public function delete(User $user, PlacementRequestResponse $response): bool
    {
        // Helper who made the response, pet owner, or admin can delete
        return $this->isAdmin($user)
            || $response->helperProfile->user_id === $user->id
            || $response->placementRequest->user_id === $user->id;
    }

    public function accept(User $user, PlacementRequestResponse $response): bool
    {
        // Only the pet owner or admin can accept a response
        return $this->isAdmin($user)
            || $response->placementRequest->user_id === $user->id;
    }

    public function reject(User $user, PlacementRequestResponse $response): bool
    {
        // Only the pet owner or admin can reject a response
        return $this->isAdmin($user)
            || $response->placementRequest->user_id === $user->id;
    }

    public function cancel(User $user, PlacementRequestResponse $response): bool
    {
        // Only the helper who made the response or admin can cancel
        return $this->isAdmin($user)
            || $response->helperProfile->user_id === $user->id;
    }

    // Admin-only for bulk/advanced actions
    public function deleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDelete(User $user, PlacementRequestResponse $response): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDeleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function restore(User $user, PlacementRequestResponse $response): bool
    {
        return $this->isAdmin($user);
    }

    public function restoreAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function replicate(User $user, PlacementRequestResponse $response): bool
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
