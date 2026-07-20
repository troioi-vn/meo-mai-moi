<?php

declare(strict_types=1);

namespace App\Http\Controllers\Invitation;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Services\InvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesErrors;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\JsonResponse;
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
    requestBody: new OA\RequestBody(
        required: false,
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'base_version', type: 'string', format: 'date-time'),
            new OA\Property(property: 'expected_target_email', type: 'string', format: 'email', nullable: true),
        ])
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Invitation revoked successfully',
            content: new OA\JsonContent(ref: '#/components/schemas/ApiEmptyDataResponse')
        ),
        new OA\Response(
            response: 404,
            description: 'Invitation not found or cannot be revoked',
            content: new OA\JsonContent(ref: '#/components/schemas/ApiErrorMessageResponse')
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
    use HandlesOfflineVersionChecks;

    public function __construct(
        private InvitationService $invitationService
    ) {}

    public function __invoke(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $invitation = Invitation::query()
            ->whereKey($id)
            ->where('inviter_user_id', $user->id)
            ->where('status', 'pending')
            ->first();
        if (! $invitation) {
            return $this->handleBusinessError(
                'Invitation not found or cannot be revoked',
                404
            );
        }
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $invitation)) {
            return $conflict;
        }
        $validated = $request->validate([
            'expected_target_email' => ['sometimes', 'nullable', 'email', 'max:255'],
        ]);
        if ($request->exists('expected_target_email')) {
            $expectedEmail = isset($validated['expected_target_email'])
                ? mb_strtolower(trim((string) $validated['expected_target_email']))
                : null;
            $currentEmail = $invitation->email !== null
                ? mb_strtolower(trim((string) $invitation->email))
                : null;
            if ($expectedEmail !== $currentEmail) {
                return $this->sendError(__('messages.offline.version_conflict'), 409);
            }
        }

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
