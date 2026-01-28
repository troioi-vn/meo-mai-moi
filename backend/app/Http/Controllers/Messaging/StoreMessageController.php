<?php

declare(strict_types=1);

namespace App\Http\Controllers\Messaging;

use App\Enums\ChatMessageType;
use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\User;
use App\Services\NotificationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class StoreMessageController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected NotificationService $notificationService
    ) {}

    #[OA\Post(
        path: '/api/msg/chats/{id}/messages',
        summary: 'Send a message in a chat',
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
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['content'],
                properties: [
                    new OA\Property(property: 'content', type: 'string', example: 'Hello!'),
                    new OA\Property(property: 'type', type: 'string', enum: ['text', 'image'], default: 'text'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Message sent',
                content: new OA\JsonContent(
                    type: 'object',
                    properties: [new OA\Property(property: 'data', ref: '#/components/schemas/ChatMessage')]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Chat not found'),
            new OA\Response(response: 422, description: 'Validation error'),
        ]
    )]
    public function __invoke(Request $request, Chat $chat)
    {
        $user = $request->user();

        $this->authorize('sendMessage', $chat);

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
        ]);

        $message = ChatMessage::create([
            'chat_id' => $chat->id,
            'sender_id' => $user->id,
            'type' => ChatMessageType::TEXT,
            'content' => $validated['content'],
        ]);

        // Update sender's last_read_at
        $chat->chatUsers()
            ->where('user_id', $user->id)
            ->update(['last_read_at' => now()]);

        // Notify other participants
        $otherParticipants = $chat->activeParticipants()
            ->where('user_id', '!=', $user->id)
            ->get();

        foreach ($otherParticipants as $participant) {
            /** @var User $participant */
            $this->notificationService->send(
                $participant,
                'new_message',
                [
                    'message' => $user->name.' sent you a message',
                    'link' => '/messages/'.$chat->id,
                    'chat_id' => $chat->id,
                    'sender_name' => $user->name,
                    'message_content' => $validated['content'],
                    'preview' => mb_substr($validated['content'], 0, 100),
                ]
            );
        }

        $message->load('sender:id,name,email');

        broadcast(new MessageSent($message))->toOthers();

        return $this->sendSuccess([
            'id' => $message->id,
            'chat_id' => $message->chat_id,
            'sender' => [
                'id' => $message->sender->id,
                'name' => $message->sender->name,
                'avatar_url' => $message->sender->avatar_url,
            ],
            'type' => $message->type->value,
            'content' => $message->content,
            'is_mine' => true,
            'created_at' => $message->created_at,
        ], 201);
    }
}
