<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\HelperProfile;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class HelperProfilePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, HelperProfile $helperProfile): bool
    {
        if ($this->isAdmin($user)) {
            return true;
        }

        // Use the model's visibility logic
        return $helperProfile->isVisibleToUser($user);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, HelperProfile $helperProfile): bool
    {
        return $this->isAdmin($user) || $helperProfile->user_id === $user->id;
    }

    public function delete(User $user, HelperProfile $helperProfile): bool
    {
        return $this->isAdmin($user) || $helperProfile->user_id === $user->id;
    }

    // Admin-only for bulk/advanced actions
    public function deleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDelete(User $user, HelperProfile $helperProfile): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDeleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function restore(User $user, HelperProfile $helperProfile): bool
    {
        return $this->isAdmin($user);
    }

    public function restoreAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function replicate(User $user, HelperProfile $helperProfile): bool
    {
        return $this->isAdmin($user);
    }

    public function reorder(User $user): bool
    {
        return $this->isAdmin($user);
    }

    private function isAdmin(User $user): bool
    {
        return method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
    }
}
