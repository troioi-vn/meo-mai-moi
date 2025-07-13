<?php

namespace App\Policies;

use App\Models\Cat;
use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Auth\Access\Response;

class CatPolicy
{
    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->role === UserRole::CAT_OWNER;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Cat $cat): bool
    {
        return $user->role === UserRole::ADMIN || $user->id === $cat->user_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Cat $cat): bool
    {
        return $user->role === UserRole::ADMIN || $user->id === $cat->user_id;
    }
}