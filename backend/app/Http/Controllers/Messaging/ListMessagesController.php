<?php

declare(strict_types=1);

namespace App\Http\Controllers\Messaging;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class ListMessagesController extends Controller
{
    use ApiResponseTrait;

    #[OA\Get(
        path: '/api/msg/chats/{id}/messages',
        summary: 'List messages in a chat (cursor pagination)',
        tags: ['Messaging'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'cursor',
                in: 'query',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'limit',
                in: 'query',
                required: false,
                schema: new OA\Schema(type: 'integer', default: 50)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'List of messages',
                content: new OA\JsonContent(
                    type: 'object',
                    properties: [
                        new OA\Property(
                            property: 'data',
                            type: 'array',
                            items: new OA\Items(ref: '#/components/schemas/ChatMessage')
                        ),
                        new OA\Property(property: 'next_cursor', type: 'string', nullable: true),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Chat not found'),
        ]
    )]
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
