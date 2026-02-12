<?php

declare(strict_types=1);

namespace App\Http\Controllers\RelationshipInvitation;

use App\Http\Controllers\Controller;
use App\Models\Pet;
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
        /** @var \App\Models\User $user */
        $user = $this->requireAuth($request);

        if (! $pet->isOwnedBy($user) && ! $this->hasRole($user, ['admin', 'super_admin'])) {
            abort(403, 'Only owners can view invitations.');
        }

        $invitations = $service->getPendingInvitations($pet);

        return $this->sendSuccess($invitations);
    }
}
