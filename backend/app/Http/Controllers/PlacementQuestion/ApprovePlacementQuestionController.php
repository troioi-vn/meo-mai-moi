<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementQuestion;

use App\Exceptions\PlacementQuestionException;
use App\Http\Controllers\Concerns\MapsPlacementQuestionExceptions;
use App\Http\Controllers\Controller;
use App\Http\Resources\PlacementQuestionResource;
use App\Models\PlacementQuestion;
use App\Services\Placement\PlacementQuestionService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/placement-questions/{question}/approve',
    summary: 'Publish a question without answering it',
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
    responses: [
        new OA\Response(response: 200, description: 'Question published'),
        new OA\Response(response: 409, description: 'Already published'),
    ]
)]
class ApprovePlacementQuestionController extends Controller
{
    use ApiResponseTrait;
    use MapsPlacementQuestionExceptions;

    public function __invoke(
        PlacementQuestion $placementQuestion,
        PlacementQuestionService $service,
    ): JsonResponse {
        $this->authorize('approve', $placementQuestion);

        try {
            $question = $service->approve($placementQuestion);
        } catch (PlacementQuestionException $exception) {
            return $this->placementQuestionExceptionResponse($exception);
        }

        return $this->sendSuccess(new PlacementQuestionResource($question));
    }
}
