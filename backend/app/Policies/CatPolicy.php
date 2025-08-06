<?php

namespace App\Policies;

use App\Models\Cat;
use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Auth\Access\HandlesAuthorization;

class CatPolicy
{
    use HandlesAuthorization;

    public function before(User $user, $ability)
    {
        if ($user->role === UserRole::ADMIN) {
            return true;
        }
    }

    public function viewAny(User $user)
    {
        return true;
    }

    public function view(?User $user, Cat $cat)
    {
        // Allow access if the cat has an active placement request.
        if ($cat->placementRequests()->where('is_active', true)->exists()) {
            return true;
        }

        // Allow access if the user is the owner of the cat.
        return $user && $user->id === $cat->user_id;
    }

    public function create(User $user)
    {
        return true;
    }

    public function update(User $user, Cat $cat)
    {
        return $user->id === $cat->user_id;
    }

    public function delete(User $user, Cat $cat)
    {
        return $user->id === $cat->user_id;
    }

    public function restore(User $user, Cat $cat)
    {
        return $user->id === $cat->user_id;
    }

    public function forceDelete(User $user, Cat $cat)
    {
        return $user->id === $cat->user_id;
    }
}
