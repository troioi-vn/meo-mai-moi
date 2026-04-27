<?php

declare(strict_types=1);

namespace App\Http\Controllers\Habit;

use App\Enums\HabitDaySummaryMode;
use App\Enums\HabitValueType;
use App\Http\Controllers\Controller;
use App\Models\Habit;
use App\Services\HabitAccessService;
use App\Services\HabitPresenter;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/habits/{habit}/heatmap',
    summary: 'Get heatmap data for a habit',
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
            description: 'Heatmap data',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/HabitDaySummary')),
                ]
            )
        ),
    ]
)]
class GetHabitHeatmapController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(
        Request $request,
        Habit $habit,
        HabitAccessService $accessService,
        HabitPresenter $presenter
    ) {
        $this->authorize('view', $habit);
        $user = $request->user();
        $weeks = max(1, min(104, (int) $request->integer('weeks', 52)));
        $endDate = Carbon::parse((string) $request->input('end_date', now()->toDateString()))->startOfDay();
        $startDate = $endDate->copy()->subDays(($weeks * 7) - 1);

        $visiblePetIds = $accessService->visibleCurrentPets($user, $habit)->pluck('id')->all();
        if ($visiblePetIds === []) {
            return $this->sendSuccess([]);
        }

        $entries = $habit->entries()
            ->whereBetween('entry_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->whereIn('pet_id', $visiblePetIds)
            ->get(['entry_date', 'value_int']);

        $byDate = $entries->groupBy(fn ($entry) => $entry->entry_date->toDateString());
        $summaries = new Collection;

        $cursor = $startDate->copy();
        while ($cursor->lte($endDate)) {
            $dateKey = $cursor->toDateString();
            $dayEntries = $byDate->get($dateKey, collect());
            $entryCount = $dayEntries->count();
            $sum = (int) $dayEntries->sum('value_int');
            $displayValue = $this->displayValue($habit, $sum, $entryCount, count($visiblePetIds));
            $normalizedIntensity = $this->normalizedIntensity($habit, $displayValue, count($visiblePetIds));

            $summaries->push([
                'date' => $dateKey,
                'average_value' => $entryCount > 0 ? round($sum / $entryCount, 2) : null,
                'display_value' => $displayValue,
                'normalized_intensity' => $normalizedIntensity,
                'entry_count' => $entryCount,
                'visible_pet_count' => count($visiblePetIds),
            ]);

            $cursor->addDay();
        }

        return $this->sendSuccess($presenter->heatmap($habit, $summaries));
    }

    private function displayValue(Habit $habit, int $sum, int $entryCount, int $visiblePetCount): ?float
    {
        if ($entryCount === 0) {
            return null;
        }

        if ($habit->value_type === HabitValueType::YES_NO) {
            return (float) $sum;
        }

        return match ($habit->day_summary_mode ?? HabitDaySummaryMode::AVERAGE_SCORED_PETS) {
            HabitDaySummaryMode::AVERAGE_ALL_PETS => round($sum / max(1, $visiblePetCount), 2),
            HabitDaySummaryMode::SUM => (float) $sum,
            HabitDaySummaryMode::AVERAGE_SCORED_PETS => round($sum / $entryCount, 2),
        };
    }

    private function normalizedIntensity(Habit $habit, ?float $displayValue, int $visiblePetCount): ?float
    {
        if ($displayValue === null) {
            return null;
        }

        if ($habit->value_type === HabitValueType::YES_NO) {
            return max(0.0, min(1.0, $displayValue / max(1, $visiblePetCount)));
        }

        $scaleMin = (int) ($habit->scale_min ?? 0);
        $scaleMax = (int) ($habit->scale_max ?? 1);

        if (($habit->day_summary_mode ?? HabitDaySummaryMode::AVERAGE_SCORED_PETS) === HabitDaySummaryMode::SUM) {
            return max(0.0, min(1.0, $displayValue / max(1, $scaleMax * $visiblePetCount)));
        }

        return max(0.0, min(1.0, ($displayValue - $scaleMin) / max(1, $scaleMax - $scaleMin)));
    }
}
