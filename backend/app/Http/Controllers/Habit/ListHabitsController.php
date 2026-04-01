<?php

declare(strict_types=1);

namespace App\Http\Controllers\Habit;

use App\Http\Controllers\Controller;
use App\Models\Habit;
use App\Services\HabitAccessService;
use App\Services\HabitPresenter;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/habits',
    summary: 'List habits available to the authenticated user',
    tags: ['Habits'],
    security: [['sanctum' => []]],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Habit list',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Habit')),
                ]
            )
        ),
    ]
)]
class ListHabitsController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, HabitAccessService $accessService, HabitPresenter $presenter)
    {
        $user = $request->user();

        $habits = $accessService->visibleHabitsQuery($user)
            ->with('pets')
            ->orderByRaw('archived_at IS NOT NULL')
            ->orderBy('name')
            ->get();
        /** @var Collection<int, Habit> $habits */

        return $this->sendSuccess(
            $habits->map(fn (Habit $habit) => $presenter->habit($user, $habit))->values()
        );
    }
}
