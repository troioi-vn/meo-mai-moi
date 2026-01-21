<?php

namespace App\Policies;

use App\Enums\PlacementRequestStatus;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PlacementRequestPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user): bool
    {
        return true;
    }

    /**
     * Determine if the user can view the placement request.
     *
     * Access rules:
     * - Admin/super_admin: can view any request
     * - Pet owner: can view their own pet's requests
     * - Helper: can view if they have responded (any status), are party to a transfer,
     *   or have an active placement relationship
     * - Anonymous/public: can view open requests (Option B - read-only for open requests)
     */
    public function view(?User $user, PlacementRequest $placementRequest): bool
    {
        // Load necessary relationships if not already loaded
        if (! $placementRequest->relationLoaded('pet')) {
            $placementRequest->load('pet');
        }

        // Anonymous users can view open requests (Option B)
        if ($user === null) {
            return $placementRequest->status === PlacementRequestStatus::OPEN;
        }

        // Admin check
        if ($this->isAdmin($user)) {
            return true;
        }

        // Pet owner check
        /** @var \App\Models\Pet $pet */
        $pet = $placementRequest->pet;
        if ($pet && $pet->isOwnedBy($user)) {
            return true;
        }

        // Helper check: has responded to this request (any status)
        if (! $placementRequest->relationLoaded('responses')) {
            $placementRequest->load('responses.helperProfile');
        }

        $hasResponded = $placementRequest->responses
            ->contains(fn ($response) => $response->helperProfile?->user_id === $user->id);

        if ($hasResponded) {
            return true;
        }

        // Helper check: is party to a transfer request
        if (! $placementRequest->relationLoaded('transferRequests')) {
            $placementRequest->load('transferRequests');
        }

        $isTransferParty = $placementRequest->transferRequests
            ->contains(fn ($transfer) => $transfer->from_user_id === $user->id || $transfer->to_user_id === $user->id);

        if ($isTransferParty) {
            return true;
        }

        // Helper check: has active placement relationship (foster/sitter) for this pet
        /** @var \App\Models\Pet $pet */
        $pet = $placementRequest->pet;
        $hasActiveRelationship = $pet->relationships()
            ->where('user_id', $user->id)
            ->whereIn('relationship_type', ['foster', 'sitter'])
            ->whereNull('end_at')
            ->exists();

        if ($hasActiveRelationship) {
            return true;
        }

        // Fallback: allow viewing open requests (authenticated users can see open requests)
        return $placementRequest->status === PlacementRequestStatus::OPEN;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, PlacementRequest $placementRequest): bool
    {
        /** @var \App\Models\Pet $pet */
        $pet = $placementRequest->pet;
        return $this->isAdmin($user) || ($pet && $pet->isOwnedBy($user));
    }

    public function delete(User $user, PlacementRequest $placementRequest): bool
    {
        /** @var \App\Models\Pet $pet */
        $pet = $placementRequest->pet;
        return $this->isAdmin($user) || ($pet && $pet->isOwnedBy($user));
    }

    // Custom abilities for owner actions
    public function confirm(User $user, PlacementRequest $placementRequest): bool
    {
        /** @var \App\Models\Pet $pet */
        $pet = $placementRequest->pet;
        return $this->isAdmin($user) || ($pet && $pet->isOwnedBy($user));
    }

    public function reject(User $user, PlacementRequest $placementRequest): bool
    {
        /** @var \App\Models\Pet $pet */
        $pet = $placementRequest->pet;
        return $this->isAdmin($user) || ($pet && $pet->isOwnedBy($user));
    }

    // Admin-only for bulk/advanced actions
    public function deleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDelete(User $user, PlacementRequest $placementRequest): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDeleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function restore(User $user, PlacementRequest $placementRequest): bool
    {
        return $this->isAdmin($user);
    }

    public function restoreAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function replicate(User $user, PlacementRequest $placementRequest): bool
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
