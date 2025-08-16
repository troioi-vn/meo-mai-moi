<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    use ApiResponseTrait;

    /**
     * List current user's notifications.
     *
     * @OA\Get(
     *   path="/api/notifications",
     *   tags={"Notifications"},
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="status", in="query", required=false, @OA\Schema(type="string", enum={"all","unread"})),
     *   @OA\Response(response=200, description="OK",
     *     @OA\JsonContent(
     *       type="object",
     *       @OA\Property(property="data", type="array",
     *         @OA\Items(
     *           @OA\Property(property="id", type="string"),
     *           @OA\Property(property="level", type="string", enum={"info","success","warning","error"}),
     *           @OA\Property(property="title", type="string"),
     *           @OA\Property(property="body", type="string", nullable=true),
     *           @OA\Property(property="url", type="string", nullable=true),
     *           @OA\Property(property="created_at", type="string", format="date-time"),
     *           @OA\Property(property="read_at", type="string", format="date-time", nullable=true)
     *         )
     *       )
     *     )
     *   )
     * )
     */
    public function index(Request $request)
    {
        $status = $request->query('status', 'all');
        $query = Notification::where('user_id', Auth::id())
            ->when($status === 'unread', function ($q) {
                $q->where('is_read', false);
            })
            ->latest();

        $items = $query->get();

        // Map to frontend contract without altering DB schema yet
        $data = $items->map(function (Notification $n) {
            return [
                'id' => (string) $n->id,
                'level' => property_exists($n, 'level') && $n->level ? $n->level : 'info',
                'title' => property_exists($n, 'title') && $n->title ? $n->title : $n->message,
                'body' => property_exists($n, 'body') ? $n->body : null,
                'url' => property_exists($n, 'url') && $n->url ? $n->url : $n->link,
                'created_at' => optional($n->created_at)->toISOString(),
                'read_at' => ($n->is_read ? optional($n->updated_at)->toISOString() : null),
            ];
        });

        return $this->sendSuccess($data);
    }

    /**
     * Mark all unread notifications as read for the current user.
     *
     * @OA\Post(
     *   path="/api/notifications/mark-all-read",
     *   tags={"Notifications"},
     *   security={{"sanctum":{}}},
     *   @OA\Response(response=204, description="No Content")
     * )
     */
    public function markAllRead()
    {
        Notification::where('user_id', Auth::id())
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return $this->sendSuccess(null, 204);
    }

    /**
     * Mark a single notification as read.
     *
     * @OA\Patch(
     *   path="/api/notifications/{id}/read",
     *   tags={"Notifications"},
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *   @OA\Response(response=204, description="No Content"),
     *   @OA\Response(response=403, description="Forbidden")
     * )
     */
    public function markRead(Notification $notification)
    {
        if ($notification->user_id !== Auth::id()) {
            return $this->sendError('Forbidden', 403);
        }

        if (!$notification->is_read) {
            $notification->is_read = true;
            $notification->save();
        }

        return $this->sendSuccess(null, 204);
    }

    // Backward-compat alias for older route name
    public function markAsRead()
    {
        return $this->markAllRead();
    }
}