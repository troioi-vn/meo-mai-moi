<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementQuestion;

use App\Enums\PlacementQuestionStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\PlacementQuestionResource;
use App\Models\PlacementQuestion;
use App\Models\PlacementRequest;
use App\Models\User;
use App\Services\PetAccessService;
use App\Services\Placement\PlacementQuestionTranslator;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/placement-requests/{id}/questions',
    summary: 'List the public Q&A for a listing',
    description: 'Published questions are visible to everyone. People who can manage the pet also see questions still waiting on them, and questions they have hidden. Questions follow the pet, so a relisted pet keeps the answers it already has.',
    tags: ['Placement Questions'],
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
            response: 200,
            description: 'Questions for this listing',
            content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/PlacementQuestion')),
            ])
        ),
    ]
)]
class ListPlacementQuestionsController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(
        Request $request,
        PlacementRequest $placementRequest,
        PetAccessService $petAccess,
        PlacementQuestionTranslator $translator,
    ): JsonResponse {
        $this->authorize('view', $placementRequest);

        $placementRequest->loadMissing('pet');

        /** @var User|null $user */
        $user = $request->user();
        $canModerate = $user !== null
            && $placementRequest->pet !== null
            && $petAccess->canManagePlacements($user, $placementRequest->pet);

        // Pet-scoped, not listing-scoped: an owner who relists keeps the
        // answers already written about this animal.
        $query = PlacementQuestion::query()
            ->where('pet_id', $placementRequest->pet_id)
            ->orderBy('published_at')
            ->orderBy('id');

        if ($canModerate) {
            $query->whereIn('status', [
                PlacementQuestionStatus::PENDING,
                PlacementQuestionStatus::PUBLISHED,
                PlacementQuestionStatus::HIDDEN,
            ]);
        } else {
            $query->where('status', PlacementQuestionStatus::PUBLISHED);
        }

        $questions = $query->get();

        PlacementQuestionResource::withTranslations($questions, $translator, app()->getLocale(), $canModerate);

        return $this->sendSuccess(PlacementQuestionResource::collection($questions));
    }
}
