<?php

declare(strict_types=1);

namespace App\Http\Controllers\ResourceInvitation;

use App\Enums\ResourceInvitationType;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ResourceInvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use RuntimeException;

#[OA\Post(
    path: '/api/mcp/ledger-invitations/preview',
    summary: 'Preview a ledger invitation without putting its bearer token in the URL',
    tags: ['Resource Invitations'],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['token'],
            properties: [
                new OA\Property(property: 'token', type: 'string', format: 'password', minLength: 64, maxLength: 64),
            ]
        )
    ),
    responses: [
        new OA\Response(response: 200, description: 'Ledger invitation details'),
        new OA\Response(response: 404, description: 'Ledger invitation not found'),
        new OA\Response(response: 410, description: 'Ledger invitation is no longer valid'),
    ]
)]
class McpPreviewLedgerInvitationController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, ResourceInvitationService $service): JsonResponse
    {
        $token = $request->validate([
            'token' => ['required', 'string', 'regex:/^[A-Za-z0-9]{64}$/'],
        ])['token'];
        $invitation = $service->findByToken($token);
        if ($invitation === null || $invitation->type !== ResourceInvitationType::LEDGER) {
            return $this->sendError(__('resource_invitations.not_found'), 404);
        }

        /** @var User $user */
        $user = $this->requireAuth($request);
        try {
            return $this->sendSuccess($service->preview($invitation, $user));
        } catch (RuntimeException) {
            return $this->sendError(__('resource_invitations.no_longer_valid'), 410);
        }
    }
}
