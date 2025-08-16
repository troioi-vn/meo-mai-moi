<?php

namespace App\Policies;

use App\Models\User;
use App\Models\TransferRequest;
use Illuminate\Auth\Access\HandlesAuthorization;

class TransferRequestPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('view_any_transfer::request');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, TransferRequest $transferRequest): bool
    {
        return $user->can('view_transfer::request');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('create_transfer::request');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, TransferRequest $transferRequest): bool
    {
        return $user->can('update_transfer::request');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, TransferRequest $transferRequest): bool
    {
        return $user->can('delete_transfer::request');
    }

    /**
     * Determine whether the user can bulk delete.
     */
    public function deleteAny(User $user): bool
    {
        return $user->can('delete_any_transfer::request');
    }

    /**
     * Determine whether the user can permanently delete.
     */
    public function forceDelete(User $user, TransferRequest $transferRequest): bool
    {
        return $user->can('force_delete_transfer::request');
    }

    /**
     * Determine whether the user can permanently bulk delete.
     */
    public function forceDeleteAny(User $user): bool
    {
        return $user->can('force_delete_any_transfer::request');
    }

    /**
     * Determine whether the user can restore.
     */
    public function restore(User $user, TransferRequest $transferRequest): bool
    {
        return $user->can('restore_transfer::request');
    }

    /**
     * Determine whether the user can bulk restore.
     */
    public function restoreAny(User $user): bool
    {
        return $user->can('restore_any_transfer::request');
    }

    /**
     * Determine whether the user can replicate.
     */
    public function replicate(User $user, TransferRequest $transferRequest): bool
    {
        return $user->can('replicate_transfer::request');
    }

    /**
     * Determine whether the user can reorder.
     */
    public function reorder(User $user): bool
    {
        return $user->can('reorder_transfer::request');
    }
}
