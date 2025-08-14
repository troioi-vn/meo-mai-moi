<?php

namespace App\Policies;

use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class PlacementRequestPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, PlacementRequest $placementRequest): bool
    {
        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, PlacementRequest $placementRequest): bool
    {
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, PlacementRequest $placementRequest): bool
    {
        Log::info('Checking delete policy', [
            'user_id' => $user->id,
            'placement_request_user_id' => $placementRequest->user_id,
        ]);
        return $user->id === $placementRequest->user_id;
    }

    public function confirm(User $user, PlacementRequest $placementRequest): bool
    {
        return $user->id === $placementRequest->user_id;
    }

    public function reject(User $user, PlacementRequest $placementRequest): bool
    {
        return $user->id === $placementRequest->user_id;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, PlacementRequest $placementRequest): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, PlacementRequest $placementRequest): bool
    {
        return false;
    }
}
