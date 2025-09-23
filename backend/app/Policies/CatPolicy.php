<?php

namespace App\Policies;

use App\Enums\CatStatus;
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
        file_put_contents(storage_path('logs/policy-debug.log'), "------\n", FILE_APPEND);
        file_put_contents(storage_path('logs/policy-debug.log'), "User: " . ($user ? $user->id : 'guest') . "\n", FILE_APPEND);
        file_put_contents(storage_path('logs/policy-debug.log'), "Cat: " . $cat->id . "\n", FILE_APPEND);
        file_put_contents(storage_path('logs/policy-debug.log'), "Cat Owner: " . $cat->user_id . "\n", FILE_APPEND);
        file_put_contents(storage_path('logs/policy-debug.log'), "Has active placement request: " . ($cat->placementRequests()->where('is_active', true)->exists() ? 'yes' : 'no') . "\n", FILE_APPEND);
        if ($user) {
            file_put_contents(storage_path('logs/policy-debug.log'), "User Roles: " . json_encode($user->getRoleNames()) . "\n", FILE_APPEND);
            file_put_contents(storage_path('logs/policy-debug.log'), "User can view_cat: " . ($user->can('view_cat') ? 'yes' : 'no') . "\n", FILE_APPEND);
        }

        // Public cats with active placement requests are visible to everyone.
        if ($cat->placementRequests()->where('is_active', true)->exists()) {
            return true;
        }

        // If there's no authenticated user, and no active placement, deny access.
        if (!$user) {
            return false;
        }

        // Authenticated users can proceed.
        // Admins and super_admins can view anything.
        if ($user->hasRole(['admin', 'super_admin'])) {
            return true;
        }

        // The owner of the cat can always view it.
        if ($cat->user_id === $user->id) {
            return true;
        }

        // An accepted responder (helper) for a transfer request can view the cat.
        $isAcceptedResponder = TransferRequest::where('cat_id', $cat->id)
            ->where('status', 'accepted')
            ->where('initiator_user_id', $user->id)
            ->exists();
        if ($isAcceptedResponder) {
            return true;
        }

        // An active fosterer can view the cat.
        $isActiveFosterer = $cat->activeFosterAssignment()
            ->where('foster_user_id', $user->id)
            ->exists();
        if ($isActiveFosterer) {
            return true;
        }

        // Finally, check for the explicit 'view_cat' permission.
        return $user->can('view_cat');
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
        if (method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin'])) {
            return true;
        }
        return $user->can('update_cat');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Cat $cat): bool
    {
        if ($user->id === $cat->user_id) {
            return true;
        }
        if (method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin'])) {
            return true;
        }
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
