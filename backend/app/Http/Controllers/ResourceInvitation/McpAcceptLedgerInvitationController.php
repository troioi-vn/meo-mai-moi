<?php

declare(strict_types=1);

namespace App\Http\Controllers\ResourceInvitation;

use App\Enums\ResourceInvitationType;
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
    path: '/api/mcp/ledger-invitations/accept',
    summary: 'Accept a ledger invitation without putting its bearer token in the URL',
    tags: ['Resource Invitations'],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['token', 'base_version'],
            properties: [
                new OA\Property(property: 'token', type: 'string', format: 'password', minLength: 64, maxLength: 64),
                new OA\Property(property: 'base_version', type: 'string'),
            ]
        )
    ),
    responses: [
        new OA\Response(response: 200, description: 'Ledger invitation accepted'),
        new OA\Response(response: 404, description: 'Ledger invitation not found'),
        new OA\Response(response: 409, description: 'Stale invitation version'),
        new OA\Response(response: 410, description: 'Ledger invitation is no longer valid'),
        new OA\Response(response: 422, description: 'The inviter cannot accept their own invitation'),
    ]
)]
class McpAcceptLedgerInvitationController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesOfflineVersionChecks;

    public function __invoke(Request $request, ResourceInvitationService $service): JsonResponse
    {
        /** @var User $user */
        $user = $this->requireAuth($request);
        $token = $request->validate([
            'token' => ['required', 'string', 'regex:/^[A-Za-z0-9]{64}$/'],
            'base_version' => ['required', 'string'],
        ])['token'];
        $invitation = $service->findByToken($token);
        if ($invitation === null || $invitation->type !== ResourceInvitationType::LEDGER) {
            return $this->sendError(__('resource_invitations.not_found'), 404);
        }
        if ($conflictResponse = $this->rejectUnlessBaseVersionMatches($request, $invitation)) {
            return $conflictResponse;
        }

        try {
            $payload = $service->accept($invitation, $user);
            $invitation->ledgerDetail?->ledger?->touch();

            return $this->sendSuccess($payload);
        } catch (RuntimeException $exception) {
            if ($exception->getMessage() === 'cannot_accept_own') {
                return $this->sendError(__('resource_invitations.cannot_accept_own'), 422);
            }

            return $this->sendError(__('resource_invitations.no_longer_valid'), 410);
        }
    }
}
