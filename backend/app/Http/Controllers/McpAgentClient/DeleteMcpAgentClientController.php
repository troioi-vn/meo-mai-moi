<?php

declare(strict_types=1);

namespace App\Http\Controllers\McpAgentClient;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\McpAgentClientService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Delete(
    path: '/api/user/mcp-agent-clients/{clientId}',
    summary: 'Revoke an MCP agent client',
    description: 'Session-authenticated browser endpoint. Deletes the client and every token minted for it.',
    tags: ['MCP Agent Clients'],
    parameters: [
        new OA\Parameter(name: 'clientId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    responses: [
        new OA\Response(response: 200, description: 'Agent client revoked'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'PAT access is forbidden for this endpoint'),
        new OA\Response(response: 404, description: 'Agent client not found'),
    ]
)]
class DeleteMcpAgentClientController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, int $clientId, McpAgentClientService $service): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        // Scoped to the caller, so another user's id is simply not found.
        $client = $user->mcpAgentClients()->whereKey($clientId)->first();
        if ($client === null) {
            return $this->sendError(__('messages.not_found'), 404);
        }

        $service->revoke($client);

        return $this->sendSuccess(['revoked' => true]);
    }
}
