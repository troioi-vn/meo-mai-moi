<?php

namespace App\Events;

use App\Models\HelperProfile;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class HelperProfileStatusUpdated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $helperProfile;

    /**
     * Create a new event instance.
     */
    public function __construct(HelperProfile $helperProfile)
    {
        $this->helperProfile = $helperProfile;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('channel-name'),
        ];
    }
}
