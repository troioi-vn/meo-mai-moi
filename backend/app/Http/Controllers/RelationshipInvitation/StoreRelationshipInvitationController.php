<?php

declare(strict_types=1);

namespace App\Http\Controllers\RelationshipInvitation;

use App\Enums\PetRelationshipType;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Services\RelationshipInvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/pets/{pet}/relationship-invitations',
    summary: 'Create a relationship invitation for a pet',
    tags: ['Relationship Invitations'],
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
            required: ['relationship_type'],
            properties: [
                new OA\Property(property: 'relationship_type', type: 'string', enum: ['owner', 'editor', 'viewer']),
            ]
        )
    ),
    responses: [
        new OA\Response(response: 201, description: 'Invitation created'),
        new OA\Response(response: 403, description: 'Forbidden'),
    ]
)]
class StoreRelationshipInvitationController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, Pet $pet, RelationshipInvitationService $service)
    {
        /** @var \App\Models\User $user */
        $user = $this->requireAuth($request);

        if (! $pet->isOwnedBy($user) && ! $this->hasRole($user, ['admin', 'super_admin'])) {
            abort(403, 'Only owners can create invitations.');
        }

        $validated = $request->validate([
            'relationship_type' => ['required', Rule::in(['owner', 'editor', 'viewer'])],
        ]);

        $type = PetRelationshipType::from($validated['relationship_type']);
        $invitation = $service->createInvitation($pet, $user, $type);
        $invitation->load('inviter');

        return $this->sendSuccess([
            'invitation' => $invitation,
            'invitation_url' => $invitation->getInvitationUrl(),
        ], 201);
    }
}
