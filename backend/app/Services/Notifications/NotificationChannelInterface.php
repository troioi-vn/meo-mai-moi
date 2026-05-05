<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Models\User;

interface NotificationChannelInterface
{
    /**
     * Send a notification through this channel.
    *
    * @param array<string, mixed> $data
     */
    public function send(User $user, string $type, array $data): bool;

    /**
     * Get the channel name.
     */
    public function getChannelName(): string;
}
