<?php

declare(strict_types=1);

namespace App\Http\Controllers\ResourceInvitation;

use App\Enums\ResourceInvitationType;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\User;
use App\Services\ResourceInvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;
use RuntimeException;

#[OA\Post(
    path: '/api/pets/{pet}/invitations',
    summary: 'Create a resource invitation for a pet',
    tags: ['Resource Invitations'],
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
        new OA\Response(
            response: 201,
            description: 'Invitation created',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean'),
                    new OA\Property(property: 'data', ref: '#/components/schemas/CreatePetResourceInvitationPayload'),
                    new OA\Property(property: 'message', type: 'string', nullable: true),
                ]
            )
        ),
        new OA\Response(response: 403, description: 'Forbidden'),
    ]
)]
class StorePetResourceInvitationController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, Pet $pet, ResourceInvitationService $service): JsonResponse
    {
        /** @var User $user */
        $user = $this->requireAuth($request);

        if (! $user->can('createInvitation', $pet)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $validated = $request->validate([
            'relationship_type' => ['required', Rule::in(['owner', 'editor', 'viewer'])],
        ]);

        try {
            $invitation = $service->create(
                ResourceInvitationType::PET,
                $user,
                $pet,
                $validated['relationship_type']
            );
        } catch (RuntimeException) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $serialized = $service->handlerFor(ResourceInvitationType::PET)->serializeForManager($invitation);

        return $this->sendSuccess([
            'invitation' => $serialized,
            'invitation_url' => $invitation->getInvitationUrl(),
        ], 201);
    }
}
