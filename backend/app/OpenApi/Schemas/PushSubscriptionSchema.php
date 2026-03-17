<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'PushSubscriptionSummary',
    title: 'Push Subscription Summary',
    required: ['id', 'endpoint'],
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'endpoint', type: 'string', example: 'https://fcm.googleapis.com/fcm/send/f1...'),
        new OA\Property(property: 'content_encoding', type: 'string', nullable: true, example: 'aes128gcm'),
        new OA\Property(property: 'expires_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'last_seen_at', type: 'string', format: 'date-time', nullable: true),
    ]
)]
#[OA\Schema(
    schema: 'PushSubscriptionKeys',
    title: 'Push Subscription Keys',
    required: ['p256dh', 'auth'],
    properties: [
        new OA\Property(property: 'p256dh', type: 'string', example: 'BIP6az...'),
        new OA\Property(property: 'auth', type: 'string', example: '6S6A...'),
    ]
)]
#[OA\Schema(
    schema: 'PushSubscriptionPayload',
    title: 'Push Subscription Payload',
    required: ['endpoint', 'keys'],
    properties: [
        new OA\Property(property: 'endpoint', type: 'string', example: 'https://fcm.googleapis.com/fcm/send/f1...'),
        new OA\Property(property: 'keys', ref: '#/components/schemas/PushSubscriptionKeys'),
        new OA\Property(property: 'content_encoding', type: 'string', example: 'aes128gcm'),
        new OA\Property(property: 'expiration_time', type: 'integer', nullable: true),
    ]
)]
class PushSubscriptionSchema {}
