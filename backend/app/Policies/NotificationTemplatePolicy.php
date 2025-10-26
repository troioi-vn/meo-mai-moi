<?php

namespace App\Policies;

use App\Models\NotificationTemplate;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class NotificationTemplatePolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('view_any_notification::template');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, NotificationTemplate $notificationTemplate): bool
    {
        return $user->can('view_notification::template');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('create_notification::template');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, NotificationTemplate $notificationTemplate): bool
    {
        return $user->can('update_notification::template');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, NotificationTemplate $notificationTemplate): bool
    {
        return $user->can('delete_notification::template');
    }

    /**
     * Determine whether the user can bulk delete.
     */
    public function deleteAny(User $user): bool
    {
        return $user->can('delete_any_notification::template');
    }

    /**
     * Determine whether the user can permanently delete.
     */
    public function forceDelete(User $user, NotificationTemplate $notificationTemplate): bool
    {
        return $user->can('force_delete_notification::template');
    }

    /**
     * Determine whether the user can permanently bulk delete.
     */
    public function forceDeleteAny(User $user): bool
    {
        return $user->can('force_delete_any_notification::template');
    }

    /**
     * Determine whether the user can restore.
     */
    public function restore(User $user, NotificationTemplate $notificationTemplate): bool
    {
        return $user->can('restore_notification::template');
    }

    /**
     * Determine whether the user can bulk restore.
     */
    public function restoreAny(User $user): bool
    {
        return $user->can('restore_any_notification::template');
    }

    /**
     * Determine whether the user can replicate.
     */
    public function replicate(User $user, NotificationTemplate $notificationTemplate): bool
    {
        return $user->can('replicate_notification::template');
    }

    /**
     * Determine whether the user can reorder.
     */
    public function reorder(User $user): bool
    {
        return $user->can('reorder_notification::template');
    }
}
