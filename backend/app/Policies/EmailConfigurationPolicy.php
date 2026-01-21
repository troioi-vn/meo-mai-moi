<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\EmailConfiguration;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class EmailConfigurationPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function view(User $user, EmailConfiguration $emailConfiguration): bool
    {
        return $this->isAdmin($user);
    }

    public function create(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function update(User $user, EmailConfiguration $emailConfiguration): bool
    {
        return $this->isAdmin($user);
    }

    public function delete(User $user, EmailConfiguration $emailConfiguration): bool
    {
        return $this->isAdmin($user);
    }

    public function deleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDelete(User $user, EmailConfiguration $emailConfiguration): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDeleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function restore(User $user, EmailConfiguration $emailConfiguration): bool
    {
        return $this->isAdmin($user);
    }

    public function restoreAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function replicate(User $user, EmailConfiguration $emailConfiguration): bool
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
