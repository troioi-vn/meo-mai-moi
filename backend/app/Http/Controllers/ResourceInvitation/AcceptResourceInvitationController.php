<?php

declare(strict_types=1);

namespace App\Http\Controllers\ResourceInvitation;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ResourceInvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use RuntimeException;

#[OA\Post(
    path: '/api/resource-invitations/{token}/accept',
    summary: 'Accept a resource invitation',
    tags: ['Resource Invitations'],
    parameters: [
        new OA\Parameter(
            name: 'token',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'string')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Invitation accepted',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean'),
                    new OA\Property(property: 'data', ref: '#/components/schemas/AcceptResourceInvitationPayload'),
                    new OA\Property(property: 'message', type: 'string', nullable: true),
                ]
            )
        ),
        new OA\Response(response: 404, description: 'Invitation not found'),
        new OA\Response(response: 410, description: 'Invitation expired or no longer valid'),
        new OA\Response(response: 422, description: 'The inviter cannot accept their own invitation'),
    ]
)]
class AcceptResourceInvitationController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesOfflineVersionChecks;

    public function __invoke(Request $request, string $token, ResourceInvitationService $service): JsonResponse
    {
        /** @var User $user */
        $user = $this->requireAuth($request);
        $invitation = $service->findByToken($token);

        if ($invitation === null) {
            return $this->sendError(__('resource_invitations.not_found'), 404);
        }

        if ($conflictResponse = $this->rejectUnlessBaseVersionMatches($request, $invitation)) {
            return $conflictResponse;
        }

        try {
            $payload = $service->accept($invitation, $user);
        } catch (RuntimeException $e) {
            return match ($e->getMessage()) {
                'cannot_accept_own' => $this->sendError(__('resource_invitations.cannot_accept_own'), 422),
                'no_longer_valid' => $this->sendError(__('resource_invitations.no_longer_valid'), 410),
                default => $this->sendError(__('resource_invitations.no_longer_valid'), 410),
            };
        }

        return $this->sendSuccess($payload);
    }
}
