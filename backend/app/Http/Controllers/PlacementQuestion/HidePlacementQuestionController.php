<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementQuestion;

use App\Http\Controllers\Controller;
use App\Http\Resources\PlacementQuestionResource;
use App\Models\PlacementQuestion;
use App\Services\Placement\PlacementQuestionService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/placement-questions/{question}/hide',
    summary: 'Withdraw a question from public view',
    tags: ['Placement Questions'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'question',
            in: 'path',
            required: true,
            description: 'ID of the placement question',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [new OA\Response(response: 200, description: 'Question hidden')]
)]
class HidePlacementQuestionController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(
        PlacementQuestion $placementQuestion,
        PlacementQuestionService $service,
    ): JsonResponse {
        $this->authorize('moderate', $placementQuestion);

        return $this->sendSuccess(new PlacementQuestionResource($service->hide($placementQuestion)));
    }
}
