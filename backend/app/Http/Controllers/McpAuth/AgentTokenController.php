<?php

declare(strict_types=1);

namespace App\Http\Controllers\McpAuth;

use App\Exceptions\McpAgentClientException;
use App\Http\Controllers\Controller;
use App\Services\McpAgentClientService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/mcp-auth/agent-token',
    summary: 'Exchange MCP agent client credentials for a short-lived token',
    description: 'Server-to-server, called only by the MCP gateway with its connector key. Mints a Sanctum token that lives at most one hour. Every refusal is invalid_client or invalid_scope.',
    tags: ['MCP Agent Clients'],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['client_id', 'client_secret'],
            properties: [
                new OA\Property(property: 'client_id', type: 'string', maxLength: 64),
                new OA\Property(property: 'client_secret', type: 'string', maxLength: 255),
                new OA\Property(property: 'scopes', type: 'array', nullable: true, items: new OA\Items(type: 'string'), description: 'Omit or null for every scope the client holds'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Token minted',
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/McpAgentToken'),
                ]
            )
        ),
        new OA\Response(response: 400, description: 'invalid_scope'),
        new OA\Response(response: 401, description: 'invalid_client, or a missing or wrong connector key'),
    ]
)]
/**
 * Server-to-server: the gateway forwards a client_credentials request here.
 * Every refusal is the same `invalid_client` so the caller learns nothing about
 * which part was wrong; the real reason goes to the log.
 */
class AgentTokenController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, McpAgentClientService $service): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'client_id' => ['required', 'string', 'max:64'],
            'client_secret' => ['required', 'string', 'max:255'],
            'scopes' => ['sometimes', 'nullable', 'array', 'list'],
            'scopes.*' => ['string', 'max:64'],
        ]);
        // Malformed input gets the same two OAuth errors as everything else.
        if ($validator->fails()) {
            $errors = $validator->errors();
            $scopeOnly = collect($errors->keys())->every(fn (string $key): bool => str_starts_with($key, 'scopes'));
            Log::info('MCP agent token refused.', ['reason' => 'malformed', 'fields' => $errors->keys()]);

            return $scopeOnly
                ? $this->sendError('invalid_scope', 400)
                : $this->sendError('invalid_client', 401);
        }
        $validated = $validator->validated();

        try {
            $issued = $service->issueToken(
                $validated['client_id'],
                $validated['client_secret'],
                isset($validated['scopes']) ? array_values($validated['scopes']) : null,
            );
        } catch (McpAgentClientException $exception) {
            Log::info('MCP agent token refused.', ['reason' => $exception->getMessage()]);
            $error = $exception->getMessage() === 'invalid_scope' ? 'invalid_scope' : 'invalid_client';

            return $this->sendError($error, $error === 'invalid_scope' ? 400 : 401);
        }

        return $this->sendSuccess($issued);
    }
}
