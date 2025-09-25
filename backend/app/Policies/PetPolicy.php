<?php

namespace App\Policies;

use App\Models\Pet;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PetPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('view_any_pet');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(?User $user, Pet $pet): bool
    {
        // Public pets with active placement requests are visible to everyone.
        if ($pet->placementRequests()->where('is_active', true)->exists()) {
            return true;
        }

        // If there's no authenticated user, and no active placement, deny access.
        if (! $user) {
            return false;
        }

        // Authenticated users can proceed.
        // Admins and super_admins can view anything.
        if ($user->hasRole(['admin', 'super_admin'])) {
            return true;
        }

        // The owner of the pet can always view it.
        if ($pet->user_id === $user->id) {
            return true;
        }

        // An accepted responder (helper) for a transfer request can view the pet.
        $isAcceptedResponder = TransferRequest::where('pet_id', $pet->id)
            ->where('status', 'accepted')
            ->where('initiator_user_id', $user->id)
            ->exists();
        if ($isAcceptedResponder) {
            return true;
        }

        // An active fosterer can view the pet.
        $isActiveFosterer = $pet->activeFosterAssignment()
            ->where('foster_user_id', $user->id)
            ->exists();
        if ($isActiveFosterer) {
            return true;
        }

        // Finally, check for the explicit 'view_pet' permission.
        return $user->can('view_pet');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('create_pet');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Pet $pet): bool
    {
        if ($user->id === $pet->user_id) {
            return true;
        }
        if (method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin'])) {
            return true;
        }

        return $user->can('update_pet');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Pet $pet): bool
    {
        if ($user->id === $pet->user_id) {
            return true;
        }
        if (method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin'])) {
            return true;
        }

        return $user->can('delete_pet');
    }

    /**
     * Determine whether the user can bulk delete.
     */
    public function deleteAny(User $user): bool
    {
        return $user->can('delete_any_pet');
    }

    /**
     * Determine whether the user can permanently delete.
     */
    public function forceDelete(User $user, Pet $pet): bool
    {
        return $user->can('force_delete_pet');
    }

    /**
     * Determine whether the user can permanently bulk delete.
     */
    public function forceDeleteAny(User $user): bool
    {
        return $user->can('force_delete_any_pet');
    }

    /**
     * Determine whether the user can restore.
     */
    public function restore(User $user, Pet $pet): bool
    {
        return $user->can('restore_pet');
    }

    /**
     * Determine whether the user can bulk restore.
     */
    public function restoreAny(User $user): bool
    {
        return $user->can('restore_any_pet');
    }

    /**
     * Determine whether the user can replicate.
     */
    public function replicate(User $user, Pet $pet): bool
    {
        return $user->can('replicate_pet');
    }

    /**
     * Determine whether the user can reorder.
     */
    public function reorder(User $user): bool
    {
        return $user->can('reorder_pet');
    }
}
