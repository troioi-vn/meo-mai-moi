<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\HelperProfile;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class HelperProfileStatusUpdated
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    private HelperProfile $helperProfile;

    /**
     * Create a new event instance.
     */
    public function __construct(HelperProfile $helperProfile)
    {
        $this->helperProfile = $helperProfile;
    }

    public function getHelperProfile(): HelperProfile
    {
        return $this->helperProfile;
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
