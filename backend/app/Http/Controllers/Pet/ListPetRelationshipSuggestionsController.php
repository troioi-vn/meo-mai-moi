<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\User;
use App\Services\PetRelationshipService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/pets/{pet}/relationship-suggestions',
    summary: 'List users previously shared on other owned pets',
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
        new OA\Response(response: 200, description: 'Previously shared users'),
        new OA\Response(response: 403, description: 'Forbidden'),
    ]
)]
class ListPetRelationshipSuggestionsController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, Pet $pet, PetRelationshipService $service): JsonResponse
    {
        /** @var User $user */
        $user = $this->requireAuth($request);

        if (! $pet->isOwnedBy($user)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $suggestions = $service->getPreviouslySharedUsers($user, $pet);

        return $this->sendSuccess($suggestions);
    }
}
