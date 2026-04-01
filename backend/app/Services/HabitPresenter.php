<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\HabitValueType;
use App\Models\Habit;
use App\Models\HabitEntry;
use App\Models\Pet;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class HabitPresenter
{
    public function __construct(
        private readonly HabitAccessService $accessService
    ) {}

    public function habit(User $user, Habit $habit): array
    {
        /** @var Collection<int, Pet> $visiblePets */
        $visiblePets = $this->accessService->visibleCurrentPets($user, $habit);
        $pets = [];

        /** @var Pet $pet */
        foreach ($visiblePets as $pet) {
            $pets[] = [
                'id' => $pet->id,
                'name' => $pet->name,
                'photo_url' => $pet->photo_url,
            ];
        }

        return [
            'id' => $habit->id,
            'name' => $habit->name,
            'value_type' => $habit->value_type->value,
            'scale_min' => $habit->scale_min,
            'scale_max' => $habit->scale_max,
            'share_with_coowners' => (bool) $habit->share_with_coowners,
            'reminder_enabled' => (bool) $habit->reminder_enabled,
            'reminder_time' => $habit->reminder_time,
            'reminder_weekdays' => $habit->reminder_weekdays,
            'archived_at' => $habit->archived_at?->toISOString(),
            'pet_count' => $visiblePets->count(),
            'pets' => $pets,
            'capabilities' => [
                'can_edit' => $this->accessService->canEditHabit($user, $habit),
                'can_delete' => $this->accessService->canDeleteHabit($user, $habit),
                'can_archive' => $this->accessService->canDeleteHabit($user, $habit),
                'can_share' => $this->accessService->canEditHabit($user, $habit),
            ],
            'created_by' => $habit->created_by,
            'created_at' => $habit->created_at?->toISOString(),
            'updated_at' => $habit->updated_at?->toISOString(),
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $summaries
     * @return array<int, array<string, mixed>>
     */
    public function heatmap(Habit $habit, Collection $summaries): array
    {
        $scaleMin = $habit->value_type === HabitValueType::YES_NO ? 0 : (int) ($habit->scale_min ?? 0);
        $scaleMax = $habit->value_type === HabitValueType::YES_NO ? 1 : (int) ($habit->scale_max ?? 1);
        $span = max(1, $scaleMax - $scaleMin);

        return $summaries->map(function (array $summary) use ($scaleMin, $span): array {
            $average = $summary['average_value'];
            $normalized = $average === null ? null : max(0.0, min(1.0, ((float) $average - $scaleMin) / $span));

            return [
                'date' => $summary['date'],
                'average_value' => $average,
                'entry_count' => (int) $summary['entry_count'],
                'visible_pet_count' => (int) $summary['visible_pet_count'],
                'normalized_intensity' => $normalized,
            ];
        })->values()->all();
    }

    /**
     * @param  Collection<int, HabitEntry>  $historicalEntries
     * @param  Collection<int, Pet>  $currentPets
     */
    public function dayEntries(
        User $user,
        Habit $habit,
        CarbonInterface $date,
        Collection $historicalEntries,
        Collection $currentPets
    ): array {
        /** @var array<int, array<string, mixed>> $entryRows */
        $entryRows = [];

        /** @var HabitEntry $entry */
        foreach ($historicalEntries as $entry) {
            if ($entry->pet === null) {
                continue;
            }

            $entryRows[$entry->pet_id] = [
                'entry_id' => $entry->id,
                'pet_id' => $entry->pet_id,
                'pet_name' => $entry->pet->name,
                'pet_photo_url' => $entry->pet->photo_url,
                'value_int' => $entry->value_int,
                'is_current_pet' => $currentPets->contains('id', $entry->pet_id),
                'has_entry' => true,
            ];
        }

        /** @var Pet $pet */
        foreach ($currentPets as $pet) {
            if (isset($entryRows[$pet->id])) {
                continue;
            }

            $entryRows[$pet->id] = [
                'entry_id' => null,
                'pet_id' => $pet->id,
                'pet_name' => $pet->name,
                'pet_photo_url' => $pet->photo_url,
                'value_int' => null,
                'is_current_pet' => true,
                'has_entry' => false,
            ];
        }

        $entries = [];

        foreach ($entryRows as $entryRow) {
            $entries[] = $entryRow;
        }

        return [
            'habit' => $this->habit($user, $habit),
            'date' => $date->toDateString(),
            'entries' => $entries,
        ];
    }
}
