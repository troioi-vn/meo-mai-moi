<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementQuestion;

use App\Http\Controllers\Controller;
use App\Http\Requests\AnswerPlacementQuestionRequest;
use App\Http\Resources\PlacementQuestionResource;
use App\Models\PlacementQuestion;
use App\Models\User;
use App\Services\Placement\PlacementQuestionService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/placement-questions/{question}/answer',
    summary: 'Answer a public question, publishing the pair',
    description: 'Answering is what makes a question public. Posting again edits the existing answer and does not re-notify the asker.',
    tags: ['Placement Questions'],
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['answer'],
            properties: [
                new OA\Property(property: 'answer', type: 'string', maxLength: 2000, example: 'Yes, she shares with two others.'),
            ]
        )
    ),
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
        new OA\Response(response: 200, description: 'Answer saved and the pair published'),
        new OA\Response(response: 403, description: 'Not entitled to speak for this listing'),
    ]
)]
class AnswerPlacementQuestionController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(
        AnswerPlacementQuestionRequest $request,
        PlacementQuestion $placementQuestion,
        PlacementQuestionService $service,
    ): JsonResponse {
        $this->authorize('answer', $placementQuestion);

        /** @var User $user */
        $user = $request->user();

        $question = $service->answer(
            question: $placementQuestion,
            answer: (string) $request->validated('answer'),
            user: $user,
            locale: app()->getLocale(),
        );

        return $this->sendSuccess(new PlacementQuestionResource($question));
    }
}
