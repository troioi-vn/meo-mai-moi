<?php

declare(strict_types=1);

namespace App\Http\Controllers\Habit;

use App\Http\Controllers\Controller;
use App\Models\Habit;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Delete(
    path: '/api/habits/{habit}',
    summary: 'Delete a habit',
    tags: ['Habits'],
    security: [['sanctum' => []]],
    parameters: [new OA\Parameter(name: 'habit', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
    responses: [new OA\Response(response: 200, description: 'Habit deleted')]
)]
class DeleteHabitController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, Habit $habit)
    {
        $this->authorize('delete', $habit);
        $habit->delete();

        return $this->sendSuccessWithMeta(null, __('messages.habits.deleted'));
    }
}
