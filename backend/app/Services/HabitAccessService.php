<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Habit;
use App\Models\HabitEntry;
use App\Models\Pet;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class HabitAccessService
{
    public function visibleHabitsQuery(User $user): Builder
    {
        return Habit::query()
            ->where(function (Builder $query) use ($user): void {
                $query->where('created_by', $user->id)
                    ->orWhere(function (Builder $sharedQuery) use ($user): void {
                        $sharedQuery->where('share_with_coowners', true)
                            ->whereHas('pets.owners', function (Builder $petOwnerQuery) use ($user): void {
                                $petOwnerQuery->where('users.id', $user->id);
                            });
                    });
            });
    }

    public function canAccessHabit(User $user, Habit $habit): bool
    {
        if ((int) $habit->created_by === (int) $user->id) {
            return true;
        }

        if (! $habit->share_with_coowners) {
            return false;
        }

        return $habit->pets()
            ->whereHas('owners', function (Builder $query) use ($user): void {
                $query->where('users.id', $user->id);
            })
            ->exists();
    }

    public function canEditHabit(User $user, Habit $habit): bool
    {
        return $this->canAccessHabit($user, $habit);
    }

    public function canDeleteHabit(User $user, Habit $habit): bool
    {
        return (int) $habit->created_by === (int) $user->id;
    }

    /**
     * @return Collection<int, Pet>
     */
    public function visibleCurrentPets(User $user, Habit $habit): Collection
    {
        /** @var Collection<int, Pet> $pets */
        $pets = $habit->pets()->get();

        if ((int) $habit->created_by === (int) $user->id) {
            return $pets;
        }

        return $pets->filter(fn (Pet $pet) => $pet->isOwnedBy($user))->values();
    }

    /**
     * @param  Collection<int, Pet>  $pets
     * @return Collection<int, Pet>
     */
    public function filterVisiblePets(User $user, Habit $habit, Collection $pets): Collection
    {
        if ((int) $habit->created_by === (int) $user->id) {
            return $pets->values();
        }

        return $pets->filter(fn (Pet $pet) => $pet->isOwnedBy($user))->values();
    }

    public function canManagePetWithinHabit(User $user, Habit $habit, Pet $pet): bool
    {
        if ((int) $habit->created_by === (int) $user->id) {
            return true;
        }

        return $pet->isOwnedBy($user);
    }

    /**
     * @return Collection<int, User>
     */
    public function reminderRecipients(Habit $habit): Collection
    {
        $habit->loadMissing('pets.owners', 'creator');

        /** @var Collection<int, User> $recipients */
        $recipients = collect([$habit->creator])
            ->filter(fn (?User $user): bool => $user !== null)
            ->values();

        if ($habit->share_with_coowners) {
            foreach ($habit->pets as $pet) {
                /** @var Pet $pet */
                $recipients = $recipients->merge($pet->owners);
            }
        }

        return $recipients->unique('id')->values();
    }

    /**
     * @param  Collection<int, HabitEntry>  $entries
     * @return Collection<int, HabitEntry>
     */
    public function filterVisibleEntries(User $user, Habit $habit, Collection $entries): Collection
    {
        if ((int) $habit->created_by === (int) $user->id) {
            return $entries->values();
        }

        return $entries
            ->filter(
                fn ($entry): bool => $entry instanceof HabitEntry
                    && $entry->pet instanceof Pet
                    && $entry->pet->isOwnedBy($user)
            )
            ->values();
    }
}
