<?php

namespace App\Http\Controllers\PushSubscription;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class ListPushSubscriptionsController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $user = $request->user();

        $items = PushSubscription::where('user_id', $user->id)->get();
        $subscriptions = [];
        foreach ($items as $subscription) {
            $subscriptions[] = [
                'id' => $subscription->id,
                'endpoint' => $subscription->endpoint,
                'content_encoding' => $subscription->content_encoding,
                'expires_at' => $subscription->expires_at?->toISOString(),
                'last_seen_at' => $subscription->last_seen_at?->toISOString(),
            ];
        }

        return $this->sendSuccess($subscriptions);
    }
}
