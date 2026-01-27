<?php

declare(strict_types=1);

namespace App\Http\Controllers\PushSubscription;

use App\Http\Controllers\Controller;
use App\Http\Requests\DeletePushSubscriptionRequest;
use App\Models\PushSubscription;
use App\Traits\ApiResponseTrait;
use OpenApi\Attributes as OA;

class DeletePushSubscriptionController extends Controller
{
    use ApiResponseTrait;

    #[OA\Delete(
        path: '/api/push-subscriptions',
        summary: 'Delete a push subscription',
        tags: ['Notifications'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['endpoint'],
                properties: [
                    new OA\Property(property: 'endpoint', type: 'string', example: 'https://fcm.googleapis.com/...'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 204,
                description: 'Subscription deleted successfully'
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 422, description: 'Validation error'),
        ]
    )]
    public function __invoke(DeletePushSubscriptionRequest $request)
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
