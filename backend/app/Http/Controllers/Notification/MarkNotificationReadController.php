<?php

namespace App\Http\Controllers\Notification;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Auth;

/**
 * Mark a single notification as read.
 *
 * @OA\Patch(
 *   path="/api/notifications/{id}/read",
 *   tags={"Notifications"},
 *   security={{"sanctum":{}}},
 *
 *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
 *
 *   @OA\Response(response=204, description="No Content"),
 *   @OA\Response(response=403, description="Forbidden")
 * )
 */
class MarkNotificationReadController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Notification $notification)
    {
        if ($notification->user_id !== Auth::id()) {
            return $this->sendError('Forbidden', 403);
        }

        if (! $notification->isRead()) {
            $notification->markAsRead();
        }

        return $this->sendSuccess(null, 204);
    }
}
