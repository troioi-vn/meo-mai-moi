<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

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
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Response;

#[OA\Delete(
    path: '/api/pets/{pet}/users/{user}',
    summary: 'Remove a user sharing access from a pet',
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
    responses: [
        new OA\Response(response: 204, description: 'User removed'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 409, description: 'Cannot remove last owner'),
    ]
)]
class RemovePetUserController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesOfflineVersionChecks;

    public function __invoke(Request $request, Pet $pet, User $user, PetRelationshipService $service): JsonResponse|Response
    {
        /** @var User $currentUser */
        $currentUser = $this->requireAuth($request);

        if (! $pet->isOwnedBy($currentUser)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        if ($conflictResponse = $this->rejectUnlessBaseVersionMatches($request, $pet)) {
            return $conflictResponse;
        }

        try {
            $service->removeUserSharingAccess($pet, $user);
        } catch (LastOwnerRemovalException) {
            return response()->json([
                'success' => false,
                'data' => ['code' => 'last_owner_conflict'],
                'message' => __('messages.pets.last_owner_cannot_leave'),
                'error' => __('messages.pets.last_owner_cannot_leave'),
            ], 409);
        }

        $pet->touch();

        return $this->sendNoContent();
    }
}
