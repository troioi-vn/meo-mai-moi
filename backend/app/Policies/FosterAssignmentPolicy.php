<?php

namespace App\Policies;

use App\Models\FosterAssignment;
use App\Models\User;

class FosterAssignmentPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasRole(['admin', 'super_admin']) || $user->can('view_any_foster_assignment');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, FosterAssignment $fosterAssignment): bool
    {
        return $user->hasRole(['admin', 'super_admin']) ||
               $user->id === $fosterAssignment->owner_user_id ||
               $user->id === $fosterAssignment->foster_user_id ||
               $user->can('view_foster_assignment');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('create_foster_assignment');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, FosterAssignment $fosterAssignment): bool
    {
        return $user->hasRole(['admin', 'super_admin']) ||
               $user->id === $fosterAssignment->owner_user_id ||
               $user->can('update_foster_assignment');
    }

    /**
     * Determine whether the user can complete the foster assignment.
     */
    public function complete(User $user, FosterAssignment $fosterAssignment): bool
    {
        return $user->hasRole(['admin', 'super_admin']) ||
               $user->id === $fosterAssignment->owner_user_id ||
               $user->id === $fosterAssignment->foster_user_id;
    }

    /**
     * Determine whether the user can cancel the foster assignment.
     */
    public function cancel(User $user, FosterAssignment $fosterAssignment): bool
    {
        return $user->hasRole(['admin', 'super_admin']) ||
               $user->id === $fosterAssignment->owner_user_id ||
               $user->id === $fosterAssignment->foster_user_id;
    }

    /**
     * Determine whether the user can extend the foster assignment.
     */
    public function extend(User $user, FosterAssignment $fosterAssignment): bool
    {
        return $user->hasRole(['admin', 'super_admin']) ||
               $user->id === $fosterAssignment->owner_user_id ||
               $user->id === $fosterAssignment->foster_user_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, FosterAssignment $fosterAssignment): bool
    {
        return $user->hasRole(['admin', 'super_admin']) ||
               $user->can('delete_foster_assignment');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, FosterAssignment $fosterAssignment): bool
    {
        return $user->can('restore_foster_assignment');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, FosterAssignment $fosterAssignment): bool
    {
        return $user->can('force_delete_foster_assignment');
    }
}
