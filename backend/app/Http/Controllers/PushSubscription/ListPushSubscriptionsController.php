<?php

declare(strict_types=1);

namespace App\Http\Controllers\PushSubscription;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class ListPushSubscriptionsController extends Controller
{
    use ApiResponseTrait;

    #[OA\Get(
        path: '/api/push-subscriptions',
        summary: 'List push subscriptions for active user',
        tags: ['Notifications'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(
                response: 200,
                description: 'List of push subscriptions',
                content: new OA\JsonContent(
                    type: 'object',
                    properties: [
                        new OA\Property(
                            property: 'data',
                            type: 'array',
                            items: new OA\Items(ref: '#/components/schemas/PushSubscriptionSummary')
                        ),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
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
