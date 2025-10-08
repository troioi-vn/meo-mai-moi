<?php

namespace App\Services\Notifications;

use App\Models\User;

interface NotificationChannelInterface
{
    /**
     * Send a notification through this channel.
     */
    public function send(User $user, string $type, array $data): bool;

    /**
     * Get the channel name.
     */
    public function getChannelName(): string;
}
