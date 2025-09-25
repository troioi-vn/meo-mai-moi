<?php

namespace App\Policies;

use App\Models\User;
use App\Models\TransferRequest;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Auth\Access\Response;

class TransferRequestPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin') || $user->can('view_any_transfer::request');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, TransferRequest $transferRequest): bool
    {
    return $user->hasRole('admin') || $user->id === $transferRequest->initiator_user_id || ($transferRequest->pet && $user->id === $transferRequest->pet->user_id) || $user->can('view_transfer::request');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->helperProfiles()->exists() || $user->can('create_transfer::request');
    }

    public function accept(User $user, TransferRequest $transferRequest): Response
    {
    // Pet owner (recipient) can accept; also allow via explicit permission
        if (($transferRequest->pet && $user->id === $transferRequest->pet->user_id)
            || ($transferRequest->recipient_user_id && $user->id === $transferRequest->recipient_user_id)
            || $user->can('accept_transfer::request')) {
            return Response::allow();
        }

    return Response::deny('Only the pet owner can accept this transfer request.');
    }

    public function reject(User $user, TransferRequest $transferRequest): Response
    {
    // Recipient (pet owner) can reject; allow permission fallback
        if (($transferRequest->pet && $user->id === $transferRequest->pet->user_id)
            || ($transferRequest->recipient_user_id && $user->id === $transferRequest->recipient_user_id)
            || $user->can('reject_transfer::request')) {
            return Response::allow();
        }

    return Response::deny('Only the pet owner can reject this transfer request.');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, TransferRequest $transferRequest): bool
    {
        return $user->id === $transferRequest->initiator_user_id || $user->can('update_transfer::request');
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

    /**
     * Allow the pet owner (recipient) to view the responder's helper profile for this transfer request.
     */
    public function viewResponderProfile(User $user, TransferRequest $transferRequest): bool
    {
        // Owner (recipient) or the initiator can view the responder's profile
    return ($transferRequest->pet && $user->id === $transferRequest->pet->user_id)
            || ($transferRequest->recipient_user_id && $user->id === $transferRequest->recipient_user_id)
            || ($transferRequest->initiator_user_id && $user->id === $transferRequest->initiator_user_id)
            || $user->hasRole('admin')
            || $user->can('view_transfer::request');
    }
}
