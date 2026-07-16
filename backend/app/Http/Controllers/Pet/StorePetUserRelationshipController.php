<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Enums\PetRelationshipType;
use App\Enums\ResourceInvitationType;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\User;
use App\Services\PetRelationshipService;
use App\Services\SharingSuggestionService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/pets/{pet}/users',
    summary: 'Directly assign a role to a suggested collaborator',
    tags: ['Pets'],
    parameters: [
        new OA\Parameter(
            name: 'pet',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['user_id', 'relationship_type'],
            properties: [
                new OA\Property(property: 'user_id', type: 'integer'),
                new OA\Property(property: 'relationship_type', type: 'string', enum: ['owner', 'editor', 'viewer']),
            ]
        )
    ),
    responses: [
        new OA\Response(response: 201, description: 'Relationship created'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]
class StorePetUserRelationshipController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(
        Request $request,
        Pet $pet,
        PetRelationshipService $service,
        SharingSuggestionService $suggestions,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->requireAuth($request);

        if (! $pet->isOwnedBy($user)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'relationship_type' => ['required', Rule::in(['owner', 'editor', 'viewer'])],
        ]);

        /** @var User $targetUser */
        $targetUser = User::query()->findOrFail($validated['user_id']);
        $type = PetRelationshipType::from($validated['relationship_type']);

        if ($targetUser->id === $user->id) {
            return $this->sendError(__('messages.pets.cannot_assign_self'), 422);
        }

        if (! $suggestions->canDirectlyAdd($user, ResourceInvitationType::PET, $pet, $targetUser)) {
            return $this->sendError(__('messages.sharing.user_not_suggested'), 422);
        }

        if ($service->isDowngradeAssignment($targetUser, $pet, $type)) {
            return $this->sendError(__('messages.pets.cannot_downgrade_relationship'), 422);
        }

        $relationship = $service->assignRelationshipWithUpgrade($targetUser, $pet, $type, $user);
        $relationship->load('user');

        return $this->sendSuccessWithMeta($relationship, __('messages.pets.relationship_added'), 201);
    }
}
