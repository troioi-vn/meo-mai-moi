<?php

declare(strict_types=1);

namespace App\Http\Controllers\Habit;

use App\Http\Controllers\Controller;
use App\Models\Habit;
use App\Services\HabitPresenter;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/habits/{habit}/restore',
    summary: 'Restore an archived habit',
    tags: ['Habits'],
    security: [['sanctum' => []]],
    parameters: [new OA\Parameter(name: 'habit', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
    responses: [new OA\Response(response: 200, description: 'Habit restored')]
)]
class RestoreHabitController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, Habit $habit, HabitPresenter $presenter)
    {
        $this->authorize('update', $habit);
        $habit->update(['archived_at' => null]);

        /** @var Habit $freshHabit */
        $freshHabit = $habit->fresh('pets');

        return $this->sendSuccessWithMeta(
            $presenter->habit($request->user(), $freshHabit),
            __('messages.habits.unarchived')
        );
    }
}
