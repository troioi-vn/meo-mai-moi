<?php

declare(strict_types=1);

namespace App\Http\Controllers\Habit;

use App\Enums\HabitValueType;
use App\Http\Controllers\Controller;
use App\Models\Habit;
use App\Models\HabitEntry;
use App\Models\Pet;
use App\Services\HabitAccessService;
use App\Services\HabitPresenter;
use App\Support\HabitTimezone;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/habits/{habit}/pet-summary',
    summary: 'Get the per-pet breakdown for a habit',
    description: 'Yes/no habits return how long since each pet was last marked yes (unbounded lookback). Integer-scale habits return a per-pet value series across the requested window.',
    tags: ['Habits'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'habit', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'weeks', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 52)),
        new OA\Parameter(name: 'end_date', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date')),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Per-pet habit summary',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/HabitPetSummaryReport'),
                ]
            )
        ),
    ]
)]
class GetHabitPetSummaryController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(
        Request $request,
        Habit $habit,
        HabitAccessService $accessService,
        HabitPresenter $presenter,
        HabitTimezone $habitTimezone
    ): JsonResponse {
        $this->authorize('view', $habit);
        $user = $request->user();
        $weeks = max(1, min(104, (int) $request->integer('weeks', 52)));
        $today = $habitTimezone->today($habit);
        $endDate = $habitTimezone->parseDate(
            $habit,
            (string) $request->input('end_date', $today->toDateString())
        );
        $startDate = $endDate->copy()->subDays(($weeks * 7) - 1);

        /** @var Collection<int, Pet> $visiblePets */
        $visiblePets = $accessService->visibleCurrentPets($user, $habit);

        if ($visiblePets->isEmpty()) {
            return $this->sendSuccess($presenter->petSummary($startDate, $endDate, []));
        }

        $visiblePetIds = $visiblePets->pluck('id')->all();
        $isYesNo = $habit->value_type === HabitValueType::YES_NO;

        $lastYesDates = $isYesNo
            ? $this->lastYesDatePerPet($habit, $visiblePetIds)
            : [];
        $seriesByPet = $isYesNo
            ? []
            : $this->seriesPerPet($habit, $visiblePetIds, $startDate->toDateString(), $endDate->toDateString());

        $rows = [];

        /** @var Pet $pet */
        foreach ($visiblePets as $pet) {
            $lastYesDate = $lastYesDates[$pet->id] ?? null;

            $rows[] = [
                'pet_id' => $pet->id,
                'pet_name' => $pet->name,
                'pet_photo_url' => $pet->photo_url,
                'last_yes_date' => $lastYesDate,
                'days_since_last_yes' => $lastYesDate === null
                    ? null
                    : (int) $habitTimezone->parseDate($habit, $lastYesDate)->diffInDays($today),
                'series' => $seriesByPet[$pet->id] ?? [],
            ];
        }

        return $this->sendSuccess($presenter->petSummary($startDate, $endDate, $rows));
    }

    /**
     * Most recent date each pet was marked yes, with no window applied — a pet's
     * last yes can predate any range the caller asks for, or never have happened.
     *
     * @param  array<int, int>  $visiblePetIds
     * @return array<int, string>
     */
    private function lastYesDatePerPet(Habit $habit, array $visiblePetIds): array
    {
        return $habit->entries()
            ->whereIn('pet_id', $visiblePetIds)
            ->where('value_int', '>', 0)
            ->groupBy('pet_id')
            ->selectRaw('pet_id, MAX(entry_date) as last_yes_date')
            ->get()
            ->mapWithKeys(fn (HabitEntry $entry): array => [
                (int) $entry->pet_id => (string) $entry->getAttribute('last_yes_date'),
            ])
            ->all();
    }

    /**
     * @param  array<int, int>  $visiblePetIds
     * @return array<int, array<int, array{date: string, value: int}>>
     */
    private function seriesPerPet(Habit $habit, array $visiblePetIds, string $startDate, string $endDate): array
    {
        return $habit->entries()
            ->whereIn('pet_id', $visiblePetIds)
            ->whereBetween('entry_date', [$startDate, $endDate])
            ->orderBy('entry_date')
            ->get(['pet_id', 'entry_date', 'value_int'])
            ->groupBy('pet_id')
            ->map(fn (Collection $entries): array => $entries
                ->map(fn (HabitEntry $entry): array => [
                    'date' => $entry->entry_date->toDateString(),
                    'value' => (int) $entry->value_int,
                ])
                ->values()
                ->all()
            )
            ->all();
    }
}
