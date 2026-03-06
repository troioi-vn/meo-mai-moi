<?php

declare(strict_types=1);

namespace App\Http\Controllers\ApiToken;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ApiTokenRevocationAuditService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Delete(
    path: '/api/user/api-tokens/{tokenId}',
    summary: 'Revoke an API token',
    description: 'Session-authenticated browser endpoint for revoking a personal access token. Bearer-token-authenticated PAT requests are rejected.',
    tags: ['API Tokens'],
    parameters: [
        new OA\Parameter(name: 'tokenId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    responses: [
        new OA\Response(response: 200, description: 'Token revoked'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'PAT access is forbidden for this endpoint'),
        new OA\Response(response: 404, description: 'Token not found'),
    ]
)]
class DeleteApiTokenController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, int $tokenId, ApiTokenRevocationAuditService $revocationAuditService)
    {
        $token = $request->user()->tokens()->whereKey($tokenId)->first();
        if ($token === null) {
            return $this->sendError(__('messages.not_found'), 404);
        }

        $actor = $request->user();
        $metadata = [
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ];

        $revocationAuditService->revokeToken(
            token: $token,
            actor: $actor instanceof User ? $actor : null,
            source: 'self_service_api',
            metadata: $metadata,
        );

        return $this->sendSuccess([
            'revoked' => true,
        ]);
    }
}
