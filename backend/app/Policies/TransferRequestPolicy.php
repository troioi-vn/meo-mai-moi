<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\TransferRequest;
use App\Models\User;
use App\Policies\Concerns\ChecksAdminRole;
use App\Services\PetAccessService;
use Illuminate\Auth\Access\HandlesAuthorization;

class TransferRequestPolicy
{
    use ChecksAdminRole;
    use HandlesAuthorization;

    public function __construct(
        private readonly PetAccessService $petAccess,
    ) {}

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, TransferRequest $transferRequest): bool
    {
        // Owner side (current placement managers) or to_user participants, and admins can view
        return $this->isAdmin($user)
            || $this->isOwnerSide($user, $transferRequest)
            || $transferRequest->to_user_id === $user->id;
    }

    public function create(User $user): bool
    {
        // Only users with at least one helper profile can initiate a transfer request
        return method_exists($user, 'helperProfiles') && $user->helperProfiles()->exists();
    }

    public function update(User $user, TransferRequest $transferRequest): bool
    {
        // Only the owner side, to_user, or admins can update
        return $this->isAdmin($user)
            || $this->isOwnerSide($user, $transferRequest)
            || $transferRequest->to_user_id === $user->id;
    }

    public function delete(User $user, TransferRequest $transferRequest): bool
    {
        return $this->update($user, $transferRequest);
    }

    public function confirm(User $user, TransferRequest $transferRequest): bool
    {
        // Only the to_user (helper receiving the pet) or admin can confirm
        return $this->isAdmin($user) || $transferRequest->to_user_id === $user->id;
    }

    public function reject(User $user, TransferRequest $transferRequest): bool
    {
        // Only the owner side or admin can reject
        return $this->isAdmin($user) || $this->isOwnerSide($user, $transferRequest);
    }

    public function cancel(User $user, TransferRequest $transferRequest): bool
    {
        // Either party or admin can cancel a pending transfer
        return $this->isAdmin($user)
            || $this->isOwnerSide($user, $transferRequest)
            || $transferRequest->to_user_id === $user->id;
    }

    public function viewResponderProfile(User $user, TransferRequest $transferRequest): bool
    {
        // Owner side and admin can view responder profile
        return $this->isAdmin($user) || $this->isOwnerSide($user, $transferRequest);
    }

    /**
     * Owner-side authority comes from the pet's CURRENT placement
     * management rights, never from the stored from_user_id audit column.
     * Fails closed when the pet cannot be resolved.
     */
    private function isOwnerSide(User $user, TransferRequest $transferRequest): bool
    {
        if (! $transferRequest->relationLoaded('placementRequest')) {
            $transferRequest->load('placementRequest.pet');
        } elseif ($transferRequest->placementRequest && ! $transferRequest->placementRequest->relationLoaded('pet')) {
            $transferRequest->placementRequest->load('pet');
        }

        $pet = $transferRequest->placementRequest?->pet;

        if (! $pet) {
            return false;
        }

        return $this->petAccess->canManagePlacements($user, $pet);
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
