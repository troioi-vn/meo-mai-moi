<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementQuestion;

use App\Exceptions\PlacementQuestionException;
use App\Http\Controllers\Concerns\MapsPlacementQuestionExceptions;
use App\Http\Controllers\Controller;
use App\Http\Requests\StorePlacementQuestionRequest;
use App\Http\Resources\PlacementQuestionResource;
use App\Models\PlacementRequest;
use App\Services\Placement\PlacementQuestionService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/placement-requests/{id}/questions',
    summary: 'Ask a public question about a listed pet',
    description: 'Open to anyone, including logged-out visitors. The question is not public until someone who can manage the pet answers or approves it. Supplying an email is optional and buys a one-off notification once the question is answered, after the address is confirmed.',
    tags: ['Placement Questions'],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['asker_name', 'question', 'altcha'],
            properties: [
                new OA\Property(property: 'asker_name', type: 'string', maxLength: 80, example: 'Linh'),
                new OA\Property(property: 'asker_email', type: 'string', format: 'email', nullable: true),
                new OA\Property(property: 'question', type: 'string', maxLength: 1000),
                new OA\Property(property: 'altcha', type: 'string', description: 'Solved Altcha payload from /altcha-challenge'),
            ]
        )
    ),
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the placement request',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 201,
            description: 'Question received and queued for review',
            content: new OA\JsonContent(properties: [
                new OA\Property(property: 'success', type: 'boolean', example: true),
                new OA\Property(property: 'data', ref: '#/components/schemas/PlacementQuestion'),
            ])
        ),
        new OA\Response(response: 422, description: 'Validation failed, or the listing is not open'),
        new OA\Response(response: 429, description: 'Rate limited, or this listing has too many unanswered questions'),
    ]
)]
class StorePlacementQuestionController extends Controller
{
    use ApiResponseTrait;
    use MapsPlacementQuestionExceptions;

    public function __invoke(
        StorePlacementQuestionRequest $request,
        PlacementRequest $placementRequest,
        PlacementQuestionService $service,
    ): JsonResponse {
        $placementRequest->loadMissing('pet');

        try {
            $question = $service->ask(
                placementRequest: $placementRequest,
                data: [
                    'asker_name' => (string) $request->validated('asker_name'),
                    'asker_email' => $request->validated('asker_email'),
                    'question' => (string) $request->validated('question'),
                ],
                ip: $request->ip(),
                locale: app()->getLocale(),
            );
        } catch (PlacementQuestionException $exception) {
            return $this->placementQuestionExceptionResponse($exception);
        }

        return $this->sendSuccess(new PlacementQuestionResource($question), 201);
    }
}
