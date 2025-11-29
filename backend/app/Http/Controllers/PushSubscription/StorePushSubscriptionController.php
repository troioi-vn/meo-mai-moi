<?php

namespace App\Http\Controllers\PushSubscription;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePushSubscriptionRequest;
use App\Models\PushSubscription;
use App\Traits\ApiResponseTrait;

class StorePushSubscriptionController extends Controller
{
    use ApiResponseTrait;

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
