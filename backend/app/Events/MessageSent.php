<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\ChatMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public ChatMessage $message) {}

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('chat.'.$this->message->chat_id),
        ];

        // Also broadcast to all active participants' private channels
        $participants = $this->message->chat->activeParticipants()->get();
        foreach ($participants as $participant) {
            $channels[] = new PrivateChannel('App.Models.User.'.$participant->id);
        }

        return $channels;
    }

    public function broadcastWith(): array
    {
        $this->message->loadMissing('sender');

        return [
            'id' => $this->message->id,
            'chat_id' => $this->message->chat_id,
            'sender' => [
                'id' => $this->message->sender->id,
                'name' => $this->message->sender->name,
                'avatar_url' => $this->message->sender->avatar_url,
            ],
            'type' => $this->message->type->value,
            'content' => $this->message->content,
            'is_mine' => false,
            'created_at' => $this->message->created_at->toIso8601String(),
        ];
    }
}
