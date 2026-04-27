<?php

declare(strict_types=1);

namespace App\Http\Controllers\RelationshipInvitation;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\User;
use App\Services\RelationshipInvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/pets/{pet}/relationship-invitations',
    summary: 'List pending relationship invitations for a pet',
    tags: ['Relationship Invitations'],
    parameters: [
        new OA\Parameter(
            name: 'pet',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(response: 200, description: 'Pending invitations'),
        new OA\Response(response: 403, description: 'Forbidden'),
    ]
)]
class ListRelationshipInvitationsController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, Pet $pet, RelationshipInvitationService $service)
    {
        /** @var User $user */
        $user = $this->requireAuth($request);

        if (! $pet->isOwnedBy($user)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $invitations = $service->getPendingInvitations($pet);

        return $this->sendSuccess($invitations);
    }
}
