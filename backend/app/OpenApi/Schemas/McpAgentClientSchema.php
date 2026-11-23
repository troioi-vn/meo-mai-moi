<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'McpAgentClient',
    title: 'MCP Agent Client',
    required: ['id', 'name', 'client_id', 'scopes', 'expires_at', 'last_used_at', 'created_at'],
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'name', type: 'string', example: 'Home agent'),
        new OA\Property(property: 'client_id', type: 'string', example: 'meo_ac_k3j2h4g5f6d7s8a9q0w1e2r3'),
        new OA\Property(property: 'scopes', type: 'array', items: new OA\Items(type: 'string')),
        new OA\Property(property: 'expires_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'last_used_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
    ]
)]
#[OA\Schema(
    schema: 'McpAgentClientsIndex',
    title: 'MCP Agent Clients Index',
    required: ['enabled', 'clients', 'available_scopes'],
    properties: [
        new OA\Property(property: 'enabled', type: 'boolean'),
        new OA\Property(property: 'clients', type: 'array', items: new OA\Items(ref: '#/components/schemas/McpAgentClient')),
        new OA\Property(property: 'available_scopes', type: 'array', items: new OA\Items(type: 'string')),
    ]
)]
#[OA\Schema(
    schema: 'McpAgentClientCreated',
    title: 'MCP Agent Client Created',
    required: ['client', 'client_secret'],
    properties: [
        new OA\Property(property: 'client', ref: '#/components/schemas/McpAgentClient'),
        new OA\Property(property: 'client_secret', type: 'string', description: 'Shown exactly once', example: 'meo_agent_...'),
    ]
)]
#[OA\Schema(
    schema: 'McpAgentToken',
    title: 'MCP Agent Token',
    required: ['user_id', 'scopes', 'sanctum_token', 'expires_at'],
    properties: [
        new OA\Property(property: 'user_id', type: 'integer'),
        new OA\Property(property: 'scopes', type: 'array', items: new OA\Items(type: 'string')),
        new OA\Property(property: 'sanctum_token', type: 'string'),
        new OA\Property(property: 'expires_at', type: 'string', format: 'date-time'),
    ]
)]
class McpAgentClientSchema {}
