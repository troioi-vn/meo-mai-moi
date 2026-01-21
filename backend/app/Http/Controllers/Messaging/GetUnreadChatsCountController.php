<?php

declare(strict_types=1);

namespace App\Http\Controllers\Messaging;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class GetUnreadChatsCountController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $user = $request->user();

        // Legacy endpoint: align with unified notifications semantics.
        // Count TOTAL unread messages across chats.
        $unreadMessageCount = ChatMessage::query()
            ->join('chats', 'chat_messages.chat_id', '=', 'chats.id')
            ->join('chat_users', function ($join) use ($user): void {
                $join->on('chat_messages.chat_id', '=', 'chat_users.chat_id')
                    ->where('chat_users.user_id', '=', $user->id)
                    ->whereNull('chat_users.left_at');
            })
            ->whereNull('chat_messages.deleted_at')
            ->whereNull('chats.deleted_at')
            ->where('chat_messages.sender_id', '!=', $user->id)
            ->where(function ($q): void {
                $q->whereNull('chat_users.last_read_at')
                    ->orWhereColumn('chat_messages.created_at', '>', 'chat_users.last_read_at');
            })
            ->count();

        return $this->sendSuccess([
            'unread_message_count' => $unreadMessageCount,
        ]);
    }
}
