<?php

declare(strict_types=1);

namespace App\Http\Controllers\Habit;

use App\Http\Controllers\Controller;
use App\Models\Habit;
use App\Services\HabitPresenter;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/habits/{habit}',
    summary: 'Show one habit',
    tags: ['Habits'],
    security: [['sanctum' => []]],
    parameters: [new OA\Parameter(name: 'habit', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Habit',
            content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Habit')])
        ),
    ]
)]
class ShowHabitController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, Habit $habit, HabitPresenter $presenter)
    {
        $this->authorize('view', $habit);
        $habit->load('pets');

        return $this->sendSuccess($presenter->habit($request->user(), $habit));
    }
}
