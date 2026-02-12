<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\User;
use App\Services\PetRelationshipService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Delete(
    path: '/api/pets/{pet}/users/{user}',
    summary: 'Remove a user from a pet (owner removes editor/viewer)',
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
        new OA\Response(response: 200, description: 'User removed'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 422, description: 'Cannot remove owner'),
    ]
)]
class RemovePetUserController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, Pet $pet, User $user, PetRelationshipService $service)
    {
        /** @var \App\Models\User $currentUser */
        $currentUser = $this->requireAuth($request);

        if (! $pet->isOwnedBy($currentUser) && ! $this->hasRole($currentUser, ['admin', 'super_admin'])) {
            abort(403, 'Only owners can remove users.');
        }

        // Cannot remove owners via this endpoint
        if ($pet->isOwnedBy($user)) {
            return $this->sendError(__('messages.pets.cannot_remove_owner'), 422);
        }

        $service->removeUserAccess($pet, $user);

        return $this->sendSuccess(null);
    }
}
