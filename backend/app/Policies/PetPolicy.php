<?php

namespace App\Policies;

use App\Enums\PlacementRequestStatus;
use App\Models\Pet;
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
        // Any authenticated user can view their own lists; granular filtering occurs at controller level.
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(?User $user, Pet $pet): bool
    {
        // Guests may view when there is an active placement request for the pet
        $hasActivePlacement = $pet->placementRequests()
            ->where('status', PlacementRequestStatus::OPEN)
            ->exists();

        if (! $user) {
            return $hasActivePlacement;
        }

        if ($this->isAdmin($user)) {
            return true;
        }

        // Owner can view
        if ($pet->user_id === $user->id) {
            return true;
        }

        // Non-owners may view when there is an active placement request for the pet
        return $hasActivePlacement;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Any authenticated user can create their own pet
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Pet $pet): bool
    {
        return $this->isAdmin($user) || $pet->user_id === $user->id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Pet $pet): bool
    {
        return $this->isAdmin($user) || $pet->user_id === $user->id;
    }

    /**
     * Optional Filament-related abilities default to admin-only.
     */
    public function deleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDelete(User $user, Pet $pet): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDeleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function restore(User $user, Pet $pet): bool
    {
        return $this->isAdmin($user);
    }

    public function restoreAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function replicate(User $user, Pet $pet): bool
    {
        return $this->isAdmin($user);
    }

    public function reorder(User $user): bool
    {
        return $this->isAdmin($user);
    }

    /**
     * Admin helper.
     */
    private function isAdmin(User $user): bool
    {
        return method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
    }
}
