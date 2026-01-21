<?php

declare(strict_types=1);

namespace App\Http\Controllers\Messaging;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class ListMessagesController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, Chat $chat)
    {
        $user = $request->user();

        $this->authorize('view', $chat);

        $validated = $request->validate([
            'cursor' => ['nullable', 'date'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $limit = $validated['limit'] ?? 50;
        $cursor = $validated['cursor'] ?? null;

        $query = $chat->messages()
            ->with('sender:id,name,email')
            ->orderByDesc('created_at');

        if ($cursor) {
            $query->where('created_at', '<', $cursor);
        }

        $messages = $query->take($limit + 1)->get();

        $hasMore = $messages->count() > $limit;
        if ($hasMore) {
            $messages = $messages->take($limit);
        }

        // Mark messages as read by updating last_read_at
        $chat->chatUsers()
            ->where('user_id', $user->id)
            ->update(['last_read_at' => now()]);

        /** @phpstan-ignore-next-line */
        $data = $messages->map(function ($message) use ($user): array {
            return [
                'id' => $message->id,
                'chat_id' => $message->chat_id,
                'sender' => [
                    'id' => $message->sender->id,
                    'name' => $message->sender->name,
                    'avatar_url' => $message->sender->avatar_url,
                ],
                'type' => $message->type->value,
                'content' => $message->content,
                'is_mine' => $message->sender_id === $user->id,
                'created_at' => $message->created_at,
            ];
        });

        return $this->sendSuccess([
            'data' => $data,
            'meta' => [
                'has_more' => $hasMore,
                'next_cursor' => $hasMore ? $messages->last()->created_at->toIso8601String() : null,
            ],
        ]);
    }
}
