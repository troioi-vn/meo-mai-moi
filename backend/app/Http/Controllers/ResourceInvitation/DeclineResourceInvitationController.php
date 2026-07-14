<?php

declare(strict_types=1);

namespace App\Http\Controllers\ResourceInvitation;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ResourceInvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

#[OA\Post(
    path: '/api/resource-invitations/{token}/decline',
    summary: 'Decline a resource invitation',
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
        new OA\Response(response: 204, description: 'Invitation declined'),
        new OA\Response(response: 404, description: 'Invitation not found'),
        new OA\Response(response: 410, description: 'Invitation expired or no longer valid'),
    ]
)]
class DeclineResourceInvitationController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, string $token, ResourceInvitationService $service): JsonResponse|Response
    {
        /** @var User $user */
        $user = $this->requireAuth($request);
        $invitation = $service->findByToken($token);

        if ($invitation === null) {
            return $this->sendError(__('resource_invitations.not_found'), 404);
        }

        try {
            $service->decline($invitation, $user);
        } catch (RuntimeException) {
            return $this->sendError(__('resource_invitations.no_longer_valid'), 410);
        }

        return $this->sendNoContent();
    }
}
