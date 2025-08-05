<?php

namespace App\Policies;

use App\Models\HelperProfile;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class HelperProfilePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, HelperProfile $helperProfile): bool
    {
        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, HelperProfile $helperProfile): bool
    {
        return $user->id === $helperProfile->user_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, HelperProfile $helperProfile): bool
    {
        return $user->id === $helperProfile->user_id;
    }

    public function deletePhoto(User $user, HelperProfile $helperProfile): bool
    {
        return $user->id === $helperProfile->user_id;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, HelperProfile $helperProfile): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, HelperProfile $helperProfile): bool
    {
        return false;
    }
}
