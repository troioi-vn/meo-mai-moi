<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Models\Notification;
use App\Models\User;
use App\Services\Notifications\Actions\NotificationActionRegistry;

class BellNotificationMapper
{
    /**
     * @return array<string, mixed>
     */
    public static function toArray(Notification $notification, User $viewer, ?NotificationActionRegistry $actions = null): array
    {
        $payload = [
            'id' => (string) $notification->id,
            'level' => $notification->getBellLevel(),
            'title' => $notification->getBellTitle(),
            'body' => $notification->getBellBody(),
            'url' => $notification->link,
            'created_at' => $notification->created_at?->toISOString(),
            'read_at' => $notification->read_at?->toISOString(),
        ];

        if ($actions) {
            $actionList = $actions->actionsFor($notification);
            if (count($actionList) > 0) {
                $payload['actions'] = $actionList;
            }
        }

        return $payload;
    }
}
