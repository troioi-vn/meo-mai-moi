<?php

declare(strict_types=1);

namespace App\Http\Controllers\Group;

use App\Enums\ResourceInvitationType;
use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\User;
use App\Services\ResourceInvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;
use RuntimeException;

#[OA\Post(
    path: '/api/groups/{group}/invitations',
    summary: 'Create a resource invitation for a group',
    tags: ['Resource Invitations'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'group',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['role'],
            properties: [
                new OA\Property(property: 'role', type: 'string', enum: ['admin', 'member']),
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
                    new OA\Property(property: 'data', ref: '#/components/schemas/CreateGroupResourceInvitationPayload'),
                    new OA\Property(property: 'message', type: 'string', nullable: true),
                ]
            )
        ),
        new OA\Response(response: 403, description: 'Forbidden'),
    ]
)]
class StoreGroupResourceInvitationController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesOfflineVersionChecks;

    public function __invoke(Request $request, Group $group, ResourceInvitationService $service): JsonResponse
    {
        /** @var User $user */
        $user = $this->requireAuth($request);

        if (! $user->can('createInvitation', $group)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $group)) {
            return $conflict;
        }

        $validated = $request->validate([
            'role' => ['required', Rule::in(['admin', 'member'])],
        ]);

        try {
            $invitation = $service->create(
                ResourceInvitationType::GROUP,
                $user,
                $group,
                $validated['role']
            );
        } catch (RuntimeException) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $serialized = $service->handlerFor(ResourceInvitationType::GROUP)->serializeForManager($invitation);
        $group->touch();

        return $this->sendSuccess([
            'invitation' => $serialized,
            'invitation_url' => $invitation->getInvitationUrl(),
        ], 201);
    }
}
