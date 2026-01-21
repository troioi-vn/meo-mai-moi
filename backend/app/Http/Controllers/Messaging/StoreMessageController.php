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

class StoreMessageController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected NotificationService $notificationService
    ) {}

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
