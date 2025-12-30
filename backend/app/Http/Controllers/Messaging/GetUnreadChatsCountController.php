<?php

namespace App\Http\Controllers\Messaging;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GetUnreadChatsCountController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $user = $request->user();

        // Optimized query: count chats with unread messages directly in SQL
        // instead of loading all chats and filtering in PHP
        $unreadChatsCount = Chat::forUser($user)
            ->whereExists(function ($query) use ($user) {
                $query->select(DB::raw(1))
                    ->from('chat_messages')
                    ->whereColumn('chat_messages.chat_id', 'chats.id')
                    ->where('chat_messages.sender_id', '!=', $user->id)
                    ->whereNull('chat_messages.deleted_at')
                    ->where(function ($q) use ($user) {
                        $q->whereNotExists(function ($subQuery) use ($user) {
                            $subQuery->select(DB::raw(1))
                                ->from('chat_users')
                                ->whereColumn('chat_users.chat_id', 'chats.id')
                                ->where('chat_users.user_id', $user->id)
                                ->whereNotNull('chat_users.last_read_at')
                                ->whereColumn('chat_messages.created_at', '<=', 'chat_users.last_read_at');
                        });
                    });
            })
            ->count();

        return $this->sendSuccess([
            'unread_chats_count' => $unreadChatsCount,
        ]);
    }
}
