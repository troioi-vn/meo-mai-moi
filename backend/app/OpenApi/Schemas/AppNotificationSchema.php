<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'AppNotification',
    title: 'App Notification',
    required: ['id', 'level', 'title', 'created_at'],
    properties: [
        new OA\Property(property: 'id', type: 'string', example: '1'),
        new OA\Property(property: 'level', type: 'string', example: 'info'),
        new OA\Property(property: 'title', type: 'string', example: 'New notification'),
        new OA\Property(property: 'body', type: 'string', example: 'You have a new notification'),
        new OA\Property(property: 'url', type: 'string', nullable: true, example: '/pets/1'),
        new OA\Property(
            property: 'actions',
            type: 'array',
            items: new OA\Items(
                type: 'object',
                properties: [
                    new OA\Property(property: 'id', type: 'string', example: 'mark_as_read'),
                    new OA\Property(property: 'label', type: 'string', example: 'Mark as read'),
                    new OA\Property(property: 'method', type: 'string', example: 'POST'),
                    new OA\Property(property: 'url', type: 'string', example: '/api/notifications/1/read'),
                    new OA\Property(property: 'style', type: 'string', example: 'primary'),
                ]
            )
        ),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'read_at', type: 'string', format: 'date-time', nullable: true),
    ]
)]
class AppNotificationSchema {}
