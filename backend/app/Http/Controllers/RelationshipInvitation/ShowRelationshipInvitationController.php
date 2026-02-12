<?php

declare(strict_types=1);

namespace App\Http\Controllers\RelationshipInvitation;

use App\Enums\RelationshipInvitationStatus;
use App\Http\Controllers\Controller;
use App\Services\RelationshipInvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/relationship-invitations/{token}',
    summary: 'Preview a relationship invitation',
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
        new OA\Response(response: 200, description: 'Invitation details'),
        new OA\Response(response: 404, description: 'Invitation not found'),
    ]
)]
class ShowRelationshipInvitationController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, string $token, RelationshipInvitationService $service)
    {
        $invitation = $service->validateToken($token);

        if (! $invitation) {
            return $this->sendError(__('messages.invitation.not_found'), 404);
        }

        /** @var \App\Models\User|null $user */
        $user = $this->resolveUser($request);
        $isAuthenticated = $user !== null;

        /** @var \App\Models\Pet $pet */
        $pet = $invitation->pet;

        $data = [
            'id' => $invitation->id,
            'token' => $invitation->token,
            'relationship_type' => $invitation->relationship_type,
            'status' => $invitation->status,
            'expires_at' => $invitation->expires_at,
            'is_valid' => $invitation->status === RelationshipInvitationStatus::PENDING && $invitation->expires_at->isFuture(),
            'is_authenticated' => $isAuthenticated,
            'pet' => [
                'id' => $pet->id,
                'name' => $pet->name,
                'photo_url' => $pet->photo_url,
                'pet_type' => $pet->petType,
            ],
            'inviter' => [
                'id' => $invitation->inviter->id,
                'name' => $invitation->inviter->name,
            ],
        ];

        // Check if the authenticated user already has this relationship
        if ($user) {
            $data['is_self_invitation'] = $invitation->invited_by_user_id === $user->id;
            $data['already_has_access'] = $pet->canBeViewedBy($user);
        }

        return $this->sendSuccess($data);
    }
}
