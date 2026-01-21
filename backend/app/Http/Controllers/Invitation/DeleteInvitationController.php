<?php

declare(strict_types=1);

namespace App\Http\Controllers\Invitation;

use App\Http\Controllers\Controller;
use App\Services\InvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesErrors;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Delete(
    path: '/api/invitations/{id}',
    summary: 'Revoke an invitation',
    description: 'Revoke a pending invitation sent by the authenticated user.',
    tags: ['Invitations'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'Invitation ID',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Invitation revoked successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string', example: 'Invitation revoked successfully'),
                ]
            )
        ),
        new OA\Response(
            response: 404,
            description: 'Invitation not found or cannot be revoked',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string', example: 'Invitation not found or cannot be revoked'),
                ]
            )
        ),
        new OA\Response(
            response: 401,
            description: 'Unauthenticated'
        ),
    ]
)]
class DeleteInvitationController extends Controller
{
    use ApiResponseTrait;
    use HandlesErrors;

    public function __construct(
        private InvitationService $invitationService
    ) {
    }

    public function __invoke(Request $request, int $id)
    {
        $user = $request->user();

        $success = $this->invitationService->revokeInvitation($id, $user);

        if (! $success) {
            return $this->handleBusinessError(
                'Invitation not found or cannot be revoked',
                404
            );
        }

        return $this->sendSuccess([], 200);
    }
}
