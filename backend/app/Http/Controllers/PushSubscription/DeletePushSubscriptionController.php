<?php

namespace App\Http\Controllers\PushSubscription;

use App\Http\Controllers\Controller;
use App\Http\Requests\DeletePushSubscriptionRequest;
use App\Models\PushSubscription;
use App\Traits\ApiResponseTrait;

class DeletePushSubscriptionController extends Controller
{
    use ApiResponseTrait;

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
