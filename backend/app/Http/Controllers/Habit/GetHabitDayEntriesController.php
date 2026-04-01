<?php

declare(strict_types=1);

namespace App\Http\Controllers\Habit;

use App\Http\Controllers\Controller;
use App\Models\Habit;
use App\Models\HabitEntry;
use App\Services\HabitAccessService;
use App\Services\HabitPresenter;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/habits/{habit}/entries/{date}',
    summary: 'Get editable entries for one habit date',
    tags: ['Habits'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'habit', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'date', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'date')),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Habit day entries',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'data',
                        properties: [
                            new OA\Property(property: 'habit', ref: '#/components/schemas/Habit'),
                            new OA\Property(property: 'date', type: 'string', format: 'date'),
                            new OA\Property(
                                property: 'entries',
                                type: 'array',
                                items: new OA\Items(ref: '#/components/schemas/HabitDayEntry')
                            ),
                        ],
                        type: 'object'
                    ),
                ]
            )
        ),
    ]
)]
class GetHabitDayEntriesController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(
        Request $request,
        Habit $habit,
        string $date,
        HabitAccessService $accessService,
        HabitPresenter $presenter
    ) {
        $this->authorize('view', $habit);
        $user = $request->user();
        $day = Carbon::parse($date)->startOfDay();

        $habit->load('pets');
        $currentPets = $accessService->visibleCurrentPets($user, $habit);
        /** @var Collection<int, HabitEntry> $historicalEntries */
        $historicalEntries = $habit->entries()
            ->with('pet')
            ->whereDate('entry_date', $day->toDateString())
            ->get();
        $historicalEntries = $accessService->filterVisibleEntries($user, $habit, $historicalEntries);

        return $this->sendSuccess(
            $presenter->dayEntries($user, $habit, $day, $historicalEntries, $currentPets)
        );
    }
}
