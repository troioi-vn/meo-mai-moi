<?php

namespace App\Http\Controllers\Messaging;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class ListChatsController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $user = $request->user();

        $chats = Chat::forUser($user)
            ->with([
                'activeParticipants' => function ($query) {
                    $query->select('users.id', 'users.name', 'users.email');
                },
                'latestMessage.sender:id,name',
                'chatUsers' => function ($query) use ($user) {
                    $query->where('user_id', $user->id);
                },
            ])
            ->withUnreadCount($user)
            ->orderByDesc(
                Chat::query()
                    ->from('chat_messages')
                    ->selectRaw('MAX(created_at)')
                    ->whereColumn('chat_messages.chat_id', 'chats.id')
            )
            ->get();

        // Transform the response
        /** @var \Illuminate\Database\Eloquent\Collection<int, Chat> $chats */
        $data = $chats->map(function (Chat $chat) use ($user): array {
            $latestMessage = $chat->latestMessage->first();
            /** @var \Illuminate\Database\Eloquent\Collection<int, User> $activeParticipants */
            $activeParticipants = $chat->activeParticipants;
            /** @var array $participants */
            $participants = $activeParticipants->map(function (User $participant): array {
                return [
                    'id' => $participant->id,
                    'name' => $participant->name,
                    'avatar_url' => $participant->avatar_url,
                ];
            });

            // For direct chats, get the other participant
            $otherParticipant = $chat->activeParticipants->firstWhere('id', '!=', $user->id);

            return [
                'id' => $chat->id,
                'type' => $chat->type->value,
                'contextable_type' => $chat->contextable_type?->value,
                'contextable_id' => $chat->contextable_id,
                'participants' => $participants,
                'other_participant' => $otherParticipant ? [
                    'id' => $otherParticipant->id,
                    'name' => $otherParticipant->name,
                    'avatar_url' => $otherParticipant->avatar_url,
                ] : null,
                'latest_message' => $latestMessage ? [
                    'id' => $latestMessage->id,
                    'content' => $latestMessage->content,
                    'sender_name' => $latestMessage->sender?->name,
                    'created_at' => $latestMessage->created_at,
                ] : null,
                'unread_count' => $chat->unread_count,
                'created_at' => $chat->created_at,
                'updated_at' => $chat->updated_at,
            ];
        });

        return $this->sendSuccess($data);
    }
}


