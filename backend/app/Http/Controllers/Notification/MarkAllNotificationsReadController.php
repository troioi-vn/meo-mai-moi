<?php

namespace App\Http\Controllers\Notification;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Auth;

/**
 * Mark all unread notifications as read for the current user.
 *
 * @OA\Post(
 *   path="/api/notifications/mark-all-read",
 *   tags={"Notifications"},
 *   security={{"sanctum":{}}},
 *
 *   @OA\Response(response=204, description="No Content")
 * )
 */
class MarkAllNotificationsReadController extends Controller
{
    use ApiResponseTrait;

    public function __invoke()
    {
        Notification::where('user_id', Auth::id())
            ->unread()
            ->update(['read_at' => now()]);

        return $this->sendSuccess(null, 204);
    }
}
