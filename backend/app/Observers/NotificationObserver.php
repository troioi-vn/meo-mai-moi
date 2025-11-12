<?php

namespace App\Observers;

use App\Models\Notification;
use App\Services\Notifications\WebPushDispatcher;
use Illuminate\Support\Facades\Log;

class NotificationObserver
{
    public function created(Notification $notification): void
    {
        $channel = data_get($notification->data, 'channel');
        if ($channel && ! str_starts_with($channel, 'in_app')) {
            return;
        }

        $user = $notification->relationLoaded('user') ? $notification->user : $notification->user()->first();
        if (! $user) {
            return;
        }

        try {
            app(WebPushDispatcher::class)->dispatch($user, $notification);
        } catch (\Throwable $e) {
            Log::warning('Failed to dispatch web push notification', [
                'notification_id' => $notification->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}

