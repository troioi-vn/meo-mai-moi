<?php

declare(strict_types=1);

namespace App\Http\Controllers\Habit;

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

            $summaries->push([
                'date' => $dateKey,
                'average_value' => $entryCount > 0 ? round($dayEntries->avg('value_int'), 2) : null,
                'entry_count' => $entryCount,
                'visible_pet_count' => count($visiblePetIds),
            ]);

            $cursor->addDay();
        }

        return $this->sendSuccess($presenter->heatmap($habit, $summaries));
    }
}
