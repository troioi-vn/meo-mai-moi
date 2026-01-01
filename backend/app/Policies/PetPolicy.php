<?php

namespace App\Policies;

use App\Enums\PetStatus;
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
        // Check if pet is publicly viewable (has active placement request OR is lost)
        $isPubliclyViewable = $this->isPubliclyViewable($pet);

        if (! $user) {
            return $isPubliclyViewable;
        }

        if ($this->isAdmin($user)) {
            return true;
        }

        // Owner can view
        if ($pet->isOwnedBy($user)) {
            return true;
        }

        // Explicit viewer/editor access
        if ($pet->canBeViewedBy($user)) {
            return true;
        }

        // Non-owners may view when pet is publicly viewable
        return $isPubliclyViewable;
    }

    /**
     * Check if pet is publicly viewable (has active placement request OR is lost).
     */
    public function isPubliclyViewable(Pet $pet): bool
    {
        // Pet is lost
        if ($pet->status === PetStatus::LOST) {
            return true;
        }

        // Pet has active placement request
        return $pet->placementRequests()
            ->where('status', PlacementRequestStatus::OPEN)
            ->exists();
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
        if ($this->isAdmin($user)) {
            return true;
        }

        return $pet->canBeEditedBy($user);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Pet $pet): bool
    {
        return $this->isAdmin($user) || $pet->isOwnedBy($user);
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
