<?php

declare(strict_types=1);

namespace App\Http\Controllers\McpAgentClient;

use App\Exceptions\McpAgentClientException;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\McpAgentClientService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/user/mcp-agent-clients',
    summary: 'Create an MCP agent client',
    description: 'Session-authenticated browser endpoint. Returns the client id and the secret; the secret is shown exactly once.',
    tags: ['MCP Agent Clients'],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['name', 'scopes'],
            properties: [
                new OA\Property(property: 'name', type: 'string', maxLength: 80, example: 'Home agent'),
                new OA\Property(property: 'scopes', type: 'array', items: new OA\Items(type: 'string')),
                new OA\Property(property: 'expires_in_days', type: 'integer', nullable: true, enum: [30, 90, 365], description: 'Omit or null for no expiry'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: 'Agent client created',
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/McpAgentClientCreated'),
                ]
            )
        ),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Feature disabled, unverified or banned account, or PAT access'),
        new OA\Response(response: 422, description: 'Validation failed'),
    ]
)]
class StoreMcpAgentClientController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, McpAgentClientService $service): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'scopes' => ['required', 'array', 'min:1'],
            'scopes.*' => ['string'],
            'expires_in_days' => ['nullable', 'integer', 'in:30,90,365'],
        ]);

        /** @var User $user */
        $user = $request->user();
        $days = $validated['expires_in_days'] ?? null;

        try {
            $created = $service->create(
                $user,
                $validated['name'],
                array_values($validated['scopes']),
                $days === null ? null : Carbon::now()->addDays((int) $days),
            );
        } catch (McpAgentClientException $exception) {
            return match ($exception->getMessage()) {
                'invalid_scope' => throw ValidationException::withMessages([
                    'scopes' => [__('validation.in', ['attribute' => 'scopes'])],
                ]),
                default => $this->sendError(__('messages.forbidden'), 403),
            };
        }

        return $this->sendSuccess([
            'client' => ListMcpAgentClientsController::present($created['client']),
            'client_secret' => $created['secret'],
        ], 201);
    }
}
