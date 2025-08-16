<?php

namespace App\Policies;

use App\Enums\CatStatus;
use App\Enums\UserRole;
use App\Models\Cat;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CatPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('view_any_cat');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(?User $user, Cat $cat): bool
    {
        // Admins can always view
        if ($user) {
            // Spatie role or enum role support
            $role = $user->role instanceof \BackedEnum ? $user->role->value : ($user->role ?? null);
            if ((method_exists($user, 'hasRole') && $user->hasRole('admin')) || $role === UserRole::ADMIN->value) {
                return true;
            }

            // Owner can view
            if ($cat->user_id === $user->id) {
                return true;
            }

            // Accepted responder (helper) can view post-acceptance
            $isAcceptedResponder = TransferRequest::where('cat_id', $cat->id)
                ->where('status', 'accepted')
                ->where('initiator_user_id', $user->id)
                ->exists();
            if ($isAcceptedResponder) {
                return true;
            }

            // Explicit permission also grants access (e.g., via Filament/Spatie)
            if ($user->can('view_cat')) {
                return true;
            }
        }

        // Guests (or authenticated users without special rights) can view cats with
        // an active placement request.
        if ($cat->placementRequests()->where('is_active', true)->exists()) {
            return true;
        }

        // Deny by default.
        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('create_cat');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Cat $cat): bool
    {
        if ($user->id === $cat->user_id) {
            return true;
        }

        return $user->can('update_cat');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Cat $cat): bool
    {
        return $user->can('delete_cat');
    }

    /**
     * Determine whether the user can bulk delete.
     */
    public function deleteAny(User $user): bool
    {
        return $user->can('delete_any_cat');
    }

    /**
     * Determine whether the user can permanently delete.
     */
    public function forceDelete(User $user, Cat $cat): bool
    {
        return $user->can('force_delete_cat');
    }

    /**
     * Determine whether the user can permanently bulk delete.
     */
    public function forceDeleteAny(User $user): bool
    {
        return $user->can('force_delete_any_cat');
    }

    /**
     * Determine whether the user can restore.
     */
    public function restore(User $user, Cat $cat): bool
    {
        return $user->can('restore_cat');
    }

    /**
     * Determine whether the user can bulk restore.
     */
    public function restoreAny(User $user): bool
    {
        return $user->can('restore_any_cat');
    }

    /**
     * Determine whether the user can replicate.
     */
    public function replicate(User $user, Cat $cat): bool
    {
        return $user->can('replicate_cat');
    }

    /**
     * Determine whether the user can reorder.
     */
    public function reorder(User $user): bool
    {
        return $user->can('reorder_cat');
    }
}
