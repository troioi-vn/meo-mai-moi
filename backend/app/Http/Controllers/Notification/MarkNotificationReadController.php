<?php

namespace App\Http\Controllers\Notification;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Auth;
use OpenApi\Attributes as OA;

#[OA\Patch(
    path: "/api/notifications/{id}/read",
    tags: ["Notifications"],
    security: [["sanctum" => []]],
    parameters: [
        new OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "string")),
    ],
    responses: [
        new OA\Response(response: 204, description: "No Content"),
        new OA\Response(response: 403, description: "Forbidden"),
    ]
)]
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