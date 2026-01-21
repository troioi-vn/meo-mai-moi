<?php

declare(strict_types=1);

namespace App\Http\Controllers\Notification;

use App\Events\NotificationRead;
use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Auth;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/notifications/mark-all-read',
    tags: ['Notifications'],
    security: [['sanctum' => []]],
    responses: [
        new OA\Response(response: 204, description: 'No Content'),
    ]
)]
class MarkAllNotificationsReadController extends Controller
{
    use ApiResponseTrait;

    public function __invoke()
    {
        Notification::where('user_id', Auth::id())
            ->bellVisible()
            ->unread()
            ->update(['read_at' => now()]);

        $unreadBellCount = Notification::query()
            ->where('user_id', Auth::id())
            ->bellVisible()
            ->unread()
            ->count();

        event(new NotificationRead((int) Auth::id(), null, true, $unreadBellCount));

        return $this->sendSuccess(null, 204);
    }
}
