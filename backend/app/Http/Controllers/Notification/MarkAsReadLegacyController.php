<?php

namespace App\Http\Controllers\Notification;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Auth;

/**
 * Mark all unread notifications as read (DEPRECATED - legacy alias).
 *
 * @OA\Post(
 *   path="/api/notifications/mark-as-read",
 *   deprecated=true,
 *   tags={"Notifications"},
 *   summary="Mark all notifications as read (DEPRECATED)",
 *   description="This endpoint is deprecated. Use POST /api/notifications/mark-all-read instead.",
 *   security={{"sanctum":{}}},
 *
 *   @OA\Response(response=204, description="No Content")
 * )
 */
class MarkAsReadLegacyController extends Controller
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
