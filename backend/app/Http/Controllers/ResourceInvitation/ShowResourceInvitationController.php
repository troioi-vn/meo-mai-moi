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

#[OA\Get(
    path: '/api/resource-invitations/{token}',
    summary: 'Preview a resource invitation',
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
            description: 'Invitation details',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean'),
                    new OA\Property(property: 'data', ref: '#/components/schemas/ResourceInvitationPreview'),
                    new OA\Property(property: 'message', type: 'string', nullable: true),
                ]
            )
        ),
        new OA\Response(response: 404, description: 'Invitation not found'),
        new OA\Response(response: 410, description: 'Invitation target is no longer available'),
    ]
)]
class ShowResourceInvitationController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, string $token, ResourceInvitationService $service): JsonResponse
    {
        $invitation = $service->findByToken($token);

        if ($invitation === null) {
            return $this->sendError(__('resource_invitations.not_found'), 404);
        }

        /** @var User|null $user */
        $user = $this->resolveUser($request);

        try {
            return $this->sendSuccess($service->preview($invitation, $user));
        } catch (RuntimeException) {
            return $this->sendError(__('resource_invitations.no_longer_valid'), 410);
        }
    }
}
