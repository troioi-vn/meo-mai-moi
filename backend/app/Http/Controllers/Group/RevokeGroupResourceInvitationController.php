<?php

declare(strict_types=1);

namespace App\Http\Controllers\Group;

use App\Enums\ResourceInvitationType;
use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\ResourceInvitation;
use App\Models\User;
use App\Services\ResourceInvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

#[OA\Delete(
    path: '/api/groups/{group}/invitations/{invitation}',
    summary: 'Revoke a group resource invitation',
    tags: ['Resource Invitations'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'group',
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
        new OA\Response(response: 204, description: 'Invitation revoked'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
        new OA\Response(response: 410, description: 'Invitation is no longer valid'),
    ]
)]
class RevokeGroupResourceInvitationController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(
        Request $request,
        Group $group,
        ResourceInvitation $invitation,
        ResourceInvitationService $service
    ): JsonResponse|Response {
        /** @var User $user */
        $user = $this->requireAuth($request);

        if (! $user->can('revokeInvitation', $group)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $invitation->loadMissing('groupDetail');

        if (
            $invitation->type !== ResourceInvitationType::GROUP
            || $invitation->groupDetail?->group_id !== $group->id
        ) {
            return $this->sendError(__('messages.not_found'), 404);
        }

        try {
            $service->revoke($invitation);
        } catch (RuntimeException) {
            return $this->sendError(__('resource_invitations.no_longer_valid'), 410);
        }

        return $this->sendNoContent();
    }
}
