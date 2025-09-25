<?php

namespace App\Policies;

use App\Models\HelperProfile;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class HelperProfilePolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('view_any_helper::profile');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(?User $user, HelperProfile $helperProfile): bool
    {
        // If the profile is public, anyone can view it.
        if ($helperProfile->is_public) {
            return true;
        }

        // If a user is logged in, they can view their own profile.
        if ($user && $user->id === $helperProfile->user_id) {
            return true;
        }

        if ($user) {
            return $user->can('view_helper::profile');
        }

        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('create_helper::profile');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(?User $user, HelperProfile $helperProfile): bool
    {
        // Reject if unauthenticated
        if (! $user) {
            return false;
        }

        // Owners can update their own helper profile; admins/others via permission
        return $user->id === $helperProfile->user_id || $user->can('update_helper::profile');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(?User $user, HelperProfile $helperProfile): bool
    {
        // Reject if unauthenticated
        if (! $user) {
            return false;
        }

        // Owners can delete their own helper profile; admins/others via permission
        return $user->id === $helperProfile->user_id || $user->can('delete_helper::profile');
    }

    /**
     * Determine whether the user can bulk delete.
     */
    public function deleteAny(User $user): bool
    {
        return $user->can('delete_any_helper::profile');
    }

    /**
     * Determine whether the user can permanently delete.
     */
    public function forceDelete(User $user, HelperProfile $helperProfile): bool
    {
        return $user->can('force_delete_helper::profile');
    }

    /**
     * Determine whether the user can permanently bulk delete.
     */
    public function forceDeleteAny(User $user): bool
    {
        return $user->can('force_delete_any_helper::profile');
    }

    /**
     * Determine whether the user can restore.
     */
    public function restore(User $user, HelperProfile $helperProfile): bool
    {
        return $user->can('restore_helper::profile');
    }

    /**
     * Determine whether the user can bulk restore.
     */
    public function restoreAny(User $user): bool
    {
        return $user->can('restore_any_helper::profile');
    }

    /**
     * Determine whether the user can replicate.
     */
    public function replicate(User $user, HelperProfile $helperProfile): bool
    {
        return $user->can('replicate_helper::profile');
    }

    /**
     * Determine whether the user can reorder.
     */
    public function reorder(User $user): bool
    {
        return $user->can('reorder_helper::profile');
    }
}
