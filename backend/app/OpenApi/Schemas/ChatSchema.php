<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'Chat',
    title: 'Chat',
    required: ['id', 'type'],
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'type', type: 'string', enum: ['direct', 'group'], example: 'direct'),
        new OA\Property(property: 'contextable_type', type: 'string', nullable: true, example: 'PlacementRequest'),
        new OA\Property(property: 'contextable_id', type: 'integer', nullable: true, example: 1),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
        new OA\Property(
            property: 'participants',
            type: 'array',
            items: new OA\Items(ref: '#/components/schemas/User')
        ),
        new OA\Property(property: 'latest_message', ref: '#/components/schemas/ChatMessage', nullable: true),
        new OA\Property(property: 'unread_count', type: 'integer', example: 2),
    ]
)]
#[OA\Schema(
    schema: 'ChatMessage',
    title: 'Chat Message',
    required: ['id', 'chat_id', 'sender_id', 'type', 'content'],
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'chat_id', type: 'integer', example: 1),
        new OA\Property(property: 'sender_id', type: 'integer', example: 1),
        new OA\Property(property: 'type', type: 'string', enum: ['text', 'image', 'system'], example: 'text'),
        new OA\Property(property: 'content', type: 'string', example: 'Hello!'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'read_at', type: 'string', format: 'date-time', nullable: true),
    ]
)]
class ChatSchema {}
