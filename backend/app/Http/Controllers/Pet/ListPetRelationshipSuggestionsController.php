<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Enums\ResourceInvitationType;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\User;
use App\Services\SharingSuggestionService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/pets/{pet}/relationship-suggestions',
    summary: 'List suggested collaborators from shared resources',
    tags: ['Pets'],
    parameters: [
        new OA\Parameter(
            name: 'pet',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(response: 200, description: 'Suggested users', content: new OA\JsonContent(properties: [
            new OA\Property(property: 'success', type: 'boolean'),
            new OA\Property(property: 'data', type: 'array', items: new OA\Items(required: ['id', 'name'], properties: [
                new OA\Property(property: 'id', type: 'integer'),
                new OA\Property(property: 'name', type: 'string'),
            ], type: 'object')),
        ])),
        new OA\Response(response: 403, description: 'Forbidden'),
    ]
)]
class ListPetRelationshipSuggestionsController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, Pet $pet, SharingSuggestionService $service): JsonResponse
    {
        /** @var User $user */
        $user = $this->requireAuth($request);

        if (! $pet->isOwnedBy($user)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $suggestions = $service->suggestionsFor($user, ResourceInvitationType::PET, $pet);

        return $this->sendSuccess($suggestions);
    }
}
