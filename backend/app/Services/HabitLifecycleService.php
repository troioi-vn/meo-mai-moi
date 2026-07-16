<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Habit;

class HabitLifecycleService
{
    public function archive(Habit $habit): Habit
    {
        $habit->update(['archived_at' => now()]);

        return $habit->refresh();
    }

    public function restore(Habit $habit): Habit
    {
        $habit->update(['archived_at' => null]);

        return $habit->refresh();
    }

    public function delete(Habit $habit): bool
    {
        return (bool) $habit->delete();
    }
}
