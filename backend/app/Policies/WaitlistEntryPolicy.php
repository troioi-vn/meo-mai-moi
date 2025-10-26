<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WaitlistEntry;
use Illuminate\Auth\Access\HandlesAuthorization;

class WaitlistEntryPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('view_any_waitlist::entry');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, WaitlistEntry $waitlistEntry): bool
    {
        return $user->can('view_waitlist::entry');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('create_waitlist::entry');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, WaitlistEntry $waitlistEntry): bool
    {
        return $user->can('update_waitlist::entry');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, WaitlistEntry $waitlistEntry): bool
    {
        return $user->can('delete_waitlist::entry');
    }

    /**
     * Determine whether the user can bulk delete.
     */
    public function deleteAny(User $user): bool
    {
        return $user->can('delete_any_waitlist::entry');
    }

    /**
     * Determine whether the user can permanently delete.
     */
    public function forceDelete(User $user, WaitlistEntry $waitlistEntry): bool
    {
        return $user->can('force_delete_waitlist::entry');
    }

    /**
     * Determine whether the user can permanently bulk delete.
     */
    public function forceDeleteAny(User $user): bool
    {
        return $user->can('force_delete_any_waitlist::entry');
    }

    /**
     * Determine whether the user can restore.
     */
    public function restore(User $user, WaitlistEntry $waitlistEntry): bool
    {
        return $user->can('restore_waitlist::entry');
    }

    /**
     * Determine whether the user can bulk restore.
     */
    public function restoreAny(User $user): bool
    {
        return $user->can('restore_any_waitlist::entry');
    }

    /**
     * Determine whether the user can replicate.
     */
    public function replicate(User $user, WaitlistEntry $waitlistEntry): bool
    {
        return $user->can('replicate_waitlist::entry');
    }

    /**
     * Determine whether the user can reorder.
     */
    public function reorder(User $user): bool
    {
        return $user->can('reorder_waitlist::entry');
    }
}
