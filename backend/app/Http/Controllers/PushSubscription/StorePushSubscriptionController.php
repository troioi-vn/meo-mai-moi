<?php

declare(strict_types=1);

namespace App\Http\Controllers\PushSubscription;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePushSubscriptionRequest;
use App\Models\PushSubscription;
use App\Traits\ApiResponseTrait;
use OpenApi\Attributes as OA;

class StorePushSubscriptionController extends Controller
{
    use ApiResponseTrait;

    #[OA\Post(
        path: '/api/push-subscriptions',
        summary: 'Store or update a push subscription',
        tags: ['Notifications'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/PushSubscriptionPayload')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Subscription stored successfully',
                content: new OA\JsonContent(
                    type: 'object',
                    properties: [
                        new OA\Property(property: 'data', properties: [
                            new OA\Property(property: 'id', type: 'integer'),
                        ], type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 422, description: 'Validation error'),
        ]
    )]
    public function __invoke(StorePushSubscriptionRequest $request)
    {
        $user = $request->user();
        $data = $request->validated();

        $hash = PushSubscription::hashEndpoint($data['endpoint']);

        $subscription = PushSubscription::updateOrCreate(
            ['endpoint_hash' => $hash],
            [
                'user_id' => $user->id,
                'endpoint' => $data['endpoint'],
                'p256dh' => $data['keys']['p256dh'],
                'auth' => $data['keys']['auth'],
                'content_encoding' => $data['content_encoding'] ?? 'aes128gcm',
                'expires_at' => $data['expiration_time'] ?? null,
                'last_seen_at' => now(),
            ]
        );

        return $this->sendSuccess([
            'id' => $subscription->id,
        ], 201);
    }
}
