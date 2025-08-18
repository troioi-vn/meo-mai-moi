<?php

namespace App\Policies;

use App\Models\User;
use App\Models\PlacementRequest;
use Illuminate\Auth\Access\HandlesAuthorization;

class PlacementRequestPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('view_any_placement::request');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, PlacementRequest $placementRequest): bool
    {
        return $user->can('view_placement::request');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('create_placement::request');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, PlacementRequest $placementRequest): bool
    {
        return $user->can('update_placement::request');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, PlacementRequest $placementRequest): bool
    {
        if ($user->id === $placementRequest->cat->user_id) {
            return true;
        }

        return $user->can('delete_placement::request');
    }

    /**
     * Determine whether the user can bulk delete.
     */
    public function deleteAny(User $user): bool
    {
        return $user->can('delete_any_placement::request');
    }

    /**
     * Determine whether the user can permanently delete.
     */
    public function forceDelete(User $user, PlacementRequest $placementRequest): bool
    {
        return $user->can('force_delete_placement::request');
    }

    /**
     * Determine whether the user can permanently bulk delete.
     */
    public function forceDeleteAny(User $user): bool
    {
        return $user->can('force_delete_any_placement::request');
    }

    /**
     * Determine whether the user can restore.
     */
    public function restore(User $user, PlacementRequest $placementRequest): bool
    {
        return $user->can('restore_placement::request');
    }

    /**
     * Determine whether the user can bulk restore.
     */
    public function restoreAny(User $user): bool
    {
        return $user->can('restore_any_placement::request');
    }

    /**
     * Determine whether the user can replicate.
     */
    public function replicate(User $user, PlacementRequest $placementRequest): bool
    {
        return $user->can('replicate_placement::request');
    }

    /**
     * Determine whether the user can reorder.
     */
    public function reorder(User $user): bool
    {
        return $user->can('reorder_placement::request');
    }

    /**
     * Confirm a placement request.
     */
    public function confirm(User $user, PlacementRequest $placementRequest): bool
    {
        // Cat owner can always confirm their own placement request
        if ($user->id === $placementRequest->cat->user_id) {
            return true;
        }

        return $user->can('confirm_placement::request');
    }

    /**
     * Reject a placement request.
     */
    public function reject(User $user, PlacementRequest $placementRequest): bool
    {
        // Cat owner can always reject their own placement request
        if ($user->id === $placementRequest->cat->user_id) {
            return true;
        }

        return $user->can('reject_placement::request');
    }
}
