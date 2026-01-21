<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'Message',
    title: 'Message',
    description: 'Message model',
    properties: [
        new OA\Property(property: 'id', type: 'integer', format: 'int64', description: 'Message ID'),
        new OA\Property(property: 'sender_id', type: 'integer', format: 'int64', description: 'ID of the user who sent the message'),
        new OA\Property(property: 'recipient_id', type: 'integer', format: 'int64', description: 'ID of the user who received the message'),
        new OA\Property(property: 'content', type: 'string', description: 'Content of the message'),
        new OA\Property(property: 'read_at', type: 'string', format: 'date-time', nullable: true, description: 'Timestamp when the message was read'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Timestamp of message creation'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Timestamp of last message update'),
    ]
)]
class MessageSchema {}
