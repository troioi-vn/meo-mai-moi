<?php

namespace App\Http\Controllers\Notification;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\Notification;
use Illuminate\Http\Request;

class GetUnifiedNotificationsController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();

        $limit = (int) $request->query('limit', 20);
        if ($limit < 1) {
            $limit = 1;
        }
        if ($limit > 50) {
            $limit = 50;
        }

        $includeBellNotifications = $request->boolean('include_bell_notifications', true);

        $baseBellQuery = Notification::query()
            ->where('user_id', $user->id)
            ->bellVisible()
            ->latest();

        $unreadBellCount = (clone $baseBellQuery)->unread()->count();

        $bellNotifications = [];
        if ($includeBellNotifications) {
            $items = (clone $baseBellQuery)->limit($limit)->get();

            $bellNotifications = $items->map(function ($n) {
                return [
                    'id' => (string) $n->id,
                    'level' => $n->getBellLevel(),
                    'title' => $n->getBellTitle(),
                    'body' => $n->getBellBody(),
                    'url' => $n->link,
                    'created_at' => $n->created_at?->toISOString(),
                    'read_at' => $n->read_at?->toISOString(),
                ];
            })->all();
        }

        // UI badge represents TOTAL unread messages across chats.
        $unreadMessageCount = ChatMessage::query()
            ->join('chats', 'chat_messages.chat_id', '=', 'chats.id')
            ->join('chat_users', function ($join) use ($user) {
                $join->on('chat_messages.chat_id', '=', 'chat_users.chat_id')
                    ->where('chat_users.user_id', '=', $user->id)
                    ->whereNull('chat_users.left_at');
            })
            ->whereNull('chat_messages.deleted_at')
            ->whereNull('chats.deleted_at')
            ->where('chat_messages.sender_id', '!=', $user->id)
            ->where(function ($q) {
                $q->whereNull('chat_users.last_read_at')
                    ->orWhereColumn('chat_messages.created_at', '>', 'chat_users.last_read_at');
            })
            ->count();

        return response()->json([
            'bell_notifications' => $bellNotifications,
            'unread_bell_count' => $unreadBellCount,
            'unread_message_count' => $unreadMessageCount,
        ]);
    }
}
