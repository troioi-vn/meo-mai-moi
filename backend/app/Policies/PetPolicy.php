<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Pet;
use App\Models\User;
use App\Policies\Concerns\ChecksAdminRole;
use App\Services\PetAccessService;
use Illuminate\Auth\Access\HandlesAuthorization;

class PetPolicy
{
    use ChecksAdminRole;
    use HandlesAuthorization;

    public function __construct(
        private readonly PetAccessService $petAccess,
    ) {}

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
     * Main-app authorization does not use global admin-role shortcuts.
     */
    public function view(?User $user, Pet $pet): bool
    {
        return $this->petAccess->canView($user, $pet);
    }

    /**
     * Check if pet is publicly viewable (has active placement request OR is lost).
     */
    public function isPubliclyViewable(Pet $pet): bool
    {
        return $this->petAccess->isPubliclyViewable($pet);
    }

    /**
     * Check if user is a recipient of a pending transfer for this pet.
     */
    public function isPendingTransferRecipient(Pet $pet, User $user): bool
    {
        return $this->petAccess->isPendingTransferRecipient($pet, $user);
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
        return $this->petAccess->canEdit($user, $pet);
    }

    /**
     * Determine whether the user can delete the model.
     * Admin operational delete stays on Filament abilities below.
     */
    public function delete(User $user, Pet $pet): bool
    {
        return $this->petAccess->canDelete($user, $pet);
    }

    /**
     * Create resource invitations for a pet (direct owners only).
     */
    public function createInvitation(User $user, Pet $pet): bool
    {
        return $this->petAccess->canManagePeople($user, $pet);
    }

    /**
     * List pending resource invitations for a pet (direct owners only).
     */
    public function viewInvitations(User $user, Pet $pet): bool
    {
        return $this->petAccess->canManagePeople($user, $pet);
    }

    /**
     * Revoke a pending resource invitation for a pet (direct owners only).
     */
    public function revokeInvitation(User $user, Pet $pet): bool
    {
        return $this->petAccess->canManagePeople($user, $pet);
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
}
