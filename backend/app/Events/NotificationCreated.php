<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Notification $notification) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('App.Models.User.'.$this->notification->user_id),
        ];
    }

    public function broadcastWith(): array
    {
        $n = $this->notification;

        $title = $n->getBellTitle();
        $body = $n->getBellBody();
        $level = $n->getBellLevel();

        $unreadBellCount = Notification::query()
            ->where('user_id', $n->user_id)
            ->bellVisible()
            ->unread()
            ->count();

        return [
            'notification' => [
                'id' => (string) $n->id,
                'level' => $level,
                'title' => $title,
                'body' => $body,
                'url' => $n->link,
                'created_at' => $n->created_at?->toISOString(),
                // Keep contract stable for the frontend type.
                // On create, the notification is always unread.
                'read_at' => null,
            ],
            'unread_bell_count' => $unreadBellCount,
        ];
    }
}
