<?php

declare(strict_types=1);

namespace App\Http\Controllers\RelationshipInvitation;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\RelationshipInvitation;
use App\Services\RelationshipInvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Delete(
    path: '/api/pets/{pet}/relationship-invitations/{invitation}',
    summary: 'Revoke a relationship invitation',
    tags: ['Relationship Invitations'],
    parameters: [
        new OA\Parameter(
            name: 'pet',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer')
        ),
        new OA\Parameter(
            name: 'invitation',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(response: 200, description: 'Invitation revoked'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
    ]
)]
class RevokeRelationshipInvitationController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, Pet $pet, RelationshipInvitation $invitation, RelationshipInvitationService $service)
    {
        /** @var \App\Models\User $user */
        $user = $this->requireAuth($request);

        if (! $pet->isOwnedBy($user) && ! $this->hasRole($user, ['admin', 'super_admin'])) {
            abort(403, 'Only owners can revoke invitations.');
        }

        if ($invitation->pet_id !== $pet->id) {
            abort(404);
        }

        if (! $invitation->isValid()) {
            return $this->sendError(__('messages.invitation.no_longer_valid'), 410);
        }

        $service->revokeInvitation($invitation);

        return $this->sendSuccess(null);
    }
}
