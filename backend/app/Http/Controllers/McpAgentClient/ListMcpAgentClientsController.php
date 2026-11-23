<?php

declare(strict_types=1);

namespace App\Http\Controllers\McpAgentClient;

use App\Http\Controllers\Controller;
use App\Models\McpAgentClient;
use App\Models\User;
use App\Services\McpAgentClientService;
use App\Services\McpConnectorService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/user/mcp-agent-clients',
    summary: 'List MCP agent clients',
    description: 'Session-authenticated browser endpoint listing the headless MCP agent credentials the user created. Secrets are never returned here.',
    tags: ['MCP Agent Clients'],
    responses: [
        new OA\Response(response: 200, description: 'Agent clients, whether the feature is enabled, and the scopes a client may hold'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'PAT access is forbidden for this endpoint'),
    ]
)]
class ListMcpAgentClientsController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, McpAgentClientService $service, McpConnectorService $connector): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $clients = $user->mcpAgentClients()->latest('id')->get()
            ->map(fn (McpAgentClient $client): array => self::present($client))
            ->all();

        return $this->sendSuccess([
            'enabled' => $service->enabled(),
            'clients' => $clients,
            'available_scopes' => $connector->supportedScopes(),
        ]);
    }

    /** @return array<string, mixed> */
    public static function present(McpAgentClient $client): array
    {
        return [
            'id' => $client->id,
            'name' => $client->name,
            'client_id' => $client->client_id,
            'scopes' => $client->scopes,
            'expires_at' => $client->expires_at?->toISOString(),
            'last_used_at' => $client->last_used_at?->toISOString(),
            'created_at' => $client->created_at?->toISOString(),
        ];
    }
}
