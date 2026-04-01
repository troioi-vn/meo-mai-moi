<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Habit;
use App\Models\User;
use App\Services\HabitAccessService;
use Illuminate\Auth\Access\HandlesAuthorization;

class HabitPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Habit $habit): bool
    {
        return app(HabitAccessService::class)->canAccessHabit($user, $habit);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Habit $habit): bool
    {
        return app(HabitAccessService::class)->canEditHabit($user, $habit);
    }

    public function delete(User $user, Habit $habit): bool
    {
        return (int) $habit->created_by === (int) $user->id;
    }
}
