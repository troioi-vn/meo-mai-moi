<?php

declare(strict_types=1);

namespace App\Http\Controllers\Messaging;

use App\Events\MessagesRead;
use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class MarkChatReadController extends Controller
{
    use ApiResponseTrait;

    #[OA\Post(
        path: '/api/msg/chats/{id}/read',
        summary: 'Mark all messages in a chat as read',
        tags: ['Messaging'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Success'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Chat not found'),
        ]
    )]
    public function __invoke(Request $request, Chat $chat)
    {
        $user = $request->user();

        $this->authorize('view', $chat);

        $readAt = now();

        $chat->chatUsers()
            ->where('user_id', $user->id)
            ->update(['last_read_at' => $readAt]);

        broadcast(new MessagesRead($chat->id, $user->id, $readAt->toIso8601String()))->toOthers();

        return $this->sendSuccess(['message' => 'Chat marked as read.']);
    }
}
