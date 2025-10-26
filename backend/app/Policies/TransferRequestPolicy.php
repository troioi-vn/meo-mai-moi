<?php

namespace App\Policies;

use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class TransferRequestPolicy
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

    public function view(User $user, TransferRequest $transferRequest): bool
    {
        // Participants (owner/recipient or initiator) and admins can view
        return $this->isAdmin($user)
            || $transferRequest->initiator_user_id === $user->id
            || $transferRequest->recipient_user_id === $user->id;
    }

    public function create(User $user): bool
    {
        // Only users with at least one helper profile can initiate a transfer request
        return method_exists($user, 'helperProfiles') && $user->helperProfiles()->exists();
    }

    public function update(User $user, TransferRequest $transferRequest): bool
    {
        // Only participants or admins can update
        return $this->isAdmin($user)
            || $transferRequest->initiator_user_id === $user->id
            || $transferRequest->recipient_user_id === $user->id;
    }

    public function delete(User $user, TransferRequest $transferRequest): bool
    {
        return $this->update($user, $transferRequest);
    }

    public function accept(User $user, TransferRequest $transferRequest): bool
    {
        // Only the recipient (pet owner) or admin can accept
        return $this->isAdmin($user) || $transferRequest->recipient_user_id === $user->id;
    }

    public function reject(User $user, TransferRequest $transferRequest): bool
    {
        // Only the recipient (pet owner) or admin can reject
        return $this->isAdmin($user) || $transferRequest->recipient_user_id === $user->id;
    }

    public function viewResponderProfile(User $user, TransferRequest $transferRequest): bool
    {
        // Owner/recipient and admin can view responder profile
        return $this->isAdmin($user) || $transferRequest->recipient_user_id === $user->id;
    }

    // Admin-only for bulk/advanced actions
    public function deleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDelete(User $user, TransferRequest $transferRequest): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDeleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function restore(User $user, TransferRequest $transferRequest): bool
    {
        return $this->isAdmin($user);
    }

    public function restoreAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function replicate(User $user, TransferRequest $transferRequest): bool
    {
        return $this->isAdmin($user);
    }

    public function reorder(User $user): bool
    {
        return $this->isAdmin($user);
    }
}
