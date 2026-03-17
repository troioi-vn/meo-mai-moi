<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageDeleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $messageId,
        public int $chatId
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('chat.'.$this->chatId),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->messageId,
            'chat_id' => $this->chatId,
        ];
    }
}
