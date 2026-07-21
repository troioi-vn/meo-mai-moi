<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Enums\PetRelationshipType;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\User;
use App\Services\LastOwnerRemovalException;
use App\Services\PetRelationshipService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

#[OA\Put(
    path: '/api/pets/{pet}/users/{user}',
    summary: 'Update a user sharing role on a pet',
    tags: ['Pets'],
    parameters: [
        new OA\Parameter(
            name: 'pet',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer')
        ),
        new OA\Parameter(
            name: 'user',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['relationship_type'],
            properties: [
                new OA\Property(property: 'relationship_type', type: 'string', enum: ['owner', 'editor', 'viewer']),
            ]
        )
    ),
    responses: [
        new OA\Response(response: 200, description: 'Relationship updated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]
class UpdatePetUserRelationshipController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesOfflineVersionChecks;

    public function __invoke(Request $request, Pet $pet, User $user, PetRelationshipService $service): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $this->requireAuth($request);

        if (! $pet->isOwnedBy($currentUser)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        if ($user->id === $currentUser->id) {
            return $this->sendError(__('messages.pets.cannot_assign_self'), 422);
        }

        if ($conflictResponse = $this->rejectUnlessBaseVersionMatches($request, $pet)) {
            return $conflictResponse;
        }

        $validated = $request->validate([
            'relationship_type' => ['required', Rule::in(['owner', 'editor', 'viewer'])],
        ]);

        try {
            $relationship = $service->setUserSharingRole(
                $pet,
                $user,
                PetRelationshipType::from($validated['relationship_type']),
                $currentUser
            );
        } catch (LastOwnerRemovalException) {
            return response()->json([
                'success' => false,
                'data' => ['code' => 'last_owner_conflict'],
                'message' => __('messages.pets.last_owner_cannot_leave'),
                'error' => __('messages.pets.last_owner_cannot_leave'),
            ], 409);
        }

        $relationship->load('user');
        $pet->touch();

        return $this->sendSuccessWithMeta($relationship, __('messages.pets.relationship_updated'), 200);
    }
}
