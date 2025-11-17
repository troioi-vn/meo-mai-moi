<?php

namespace App\Http\Controllers;

use App\Http\Requests\DeletePushSubscriptionRequest;
use App\Http\Requests\StorePushSubscriptionRequest;
use App\Models\PushSubscription;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request)
    {
        $user = $request->user();

        $subscriptions = PushSubscription::where('user_id', $user->id)
            ->get()
            ->map(fn (PushSubscription $subscription) => [
                'id' => $subscription->id,
                'endpoint' => $subscription->endpoint,
                'content_encoding' => $subscription->content_encoding,
                'expires_at' => optional($subscription->expires_at)->toISOString(),
                'last_seen_at' => optional($subscription->last_seen_at)->toISOString(),
            ]);

        return $this->sendSuccess($subscriptions);
    }

    public function store(StorePushSubscriptionRequest $request)
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

    public function destroy(DeletePushSubscriptionRequest $request)
    {
        $user = $request->user();
        $data = $request->validated();
        $hash = PushSubscription::hashEndpoint($data['endpoint']);

        PushSubscription::where('endpoint_hash', $hash)
            ->where('user_id', $user->id)
            ->delete();

        return $this->sendSuccess(null, 204);
    }
}
