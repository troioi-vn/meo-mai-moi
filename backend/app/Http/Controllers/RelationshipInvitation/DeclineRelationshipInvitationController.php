<?php

declare(strict_types=1);

namespace App\Http\Controllers\RelationshipInvitation;

use App\Http\Controllers\Controller;
use App\Services\RelationshipInvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/relationship-invitations/{token}/decline',
    summary: 'Decline a relationship invitation',
    tags: ['Relationship Invitations'],
    parameters: [
        new OA\Parameter(
            name: 'token',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'string')
        ),
    ],
    responses: [
        new OA\Response(response: 200, description: 'Invitation declined'),
        new OA\Response(response: 404, description: 'Invitation not found'),
        new OA\Response(response: 410, description: 'Invitation expired or no longer valid'),
    ]
)]
class DeclineRelationshipInvitationController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, string $token, RelationshipInvitationService $service)
    {
        $this->requireAuth($request);
        $invitation = $service->validateToken($token);

        if (! $invitation) {
            return $this->sendError(__('messages.invitation.not_found'), 404);
        }

        if (! $invitation->isValid()) {
            return $this->sendError(__('messages.invitation.no_longer_valid'), 410);
        }

        $service->declineInvitation($invitation);

        return $this->sendSuccess(null);
    }
}
