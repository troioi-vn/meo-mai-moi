<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementQuestion;

use App\Http\Controllers\Controller;
use App\Http\Resources\PlacementQuestionResource;
use App\Models\PlacementQuestion;
use App\Services\Placement\PlacementQuestionTranslator;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/placement-questions/{question}/translate',
    summary: 'Translate one published pair on demand',
    description: 'For pairs past the per-pet translation budget. Only published pairs qualify, so the total work this can ever ask for is bounded by how much a rescue has actually answered.',
    tags: ['Placement Questions'],
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
        new OA\Response(response: 200, description: 'Translation requested; poll the listing for status'),
        new OA\Response(response: 404, description: 'Question is not public'),
    ]
)]
class TranslatePlacementQuestionController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(
        PlacementQuestion $placementQuestion,
        PlacementQuestionTranslator $translator,
    ): JsonResponse {
        // Only published pairs. An unanswered question is never translated, on
        // demand or otherwise - that is what keeps a proof-of-work solver from
        // spending the translation budget.
        if (! $placementQuestion->isPublic() || ! $placementQuestion->isAnswered()) {
            return $this->sendError(__('messages.placement_questions.errors.not_public'), 404);
        }

        $placementQuestion->setAttribute(
            'question_translation',
            $translator->present($placementQuestion, app()->getLocale(), force: true),
        );

        return $this->sendSuccess(new PlacementQuestionResource($placementQuestion));
    }
}
