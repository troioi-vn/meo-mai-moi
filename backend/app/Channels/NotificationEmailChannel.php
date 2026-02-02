<?php

declare(strict_types=1);

namespace App\Channels;

use App\Jobs\SendNotificationEmail;
use App\Models\Notification;
use Illuminate\Notifications\Notification as LaravelNotification;
use Illuminate\Support\Facades\Log;

class NotificationEmailChannel
{
    /**
     * Send the given notification.
     */
    public function send($notifiable, LaravelNotification $notification): void
    {
        // Get the notification data from the notification class
        if (! method_exists($notification, 'toNotificationEmail')) {
            // This notification is not designed for the notification_email channel.
            // You can log an error here if you want.
            // For example: \Log::error('Notification of class '.get_class($notification).' is not emailable.');
            return;
        }
        $notificationData = $notification->toNotificationEmail($notifiable);

        // Idempotency: prevent duplicate email verification notifications in a short window
        if (($notificationData['type'] ?? null) === 'email_verification') {
            $window = (int) config('notifications.email_verification_idempotency_seconds', 30);
            $recent = \App\Models\Notification::query()
                ->where('user_id', $notifiable->id)
                ->where('type', 'email_verification')
                ->whereNull('failed_at')
                ->where('created_at', '>=', now()->subSeconds($window))
                ->exists();
            if ($recent) {
                Log::info('Skipped duplicate email verification notification (idempotency window)', [
                    'user_id' => $notifiable->id,
                ]);

                return;
            }
        }

        // Clean the data to avoid storing complex objects that cause admin panel issues
        $cleanData = [
            'channel' => 'email',
            'verificationUrl' => $notificationData['data']['verificationUrl'] ?? null,
            'appName' => $notificationData['data']['appName'] ?? config('app.name'),
        ];

        // Create a notification record for tracking
        $notificationRecord = Notification::create([
            'user_id' => $notifiable->id,
            'type' => $notificationData['type'],
            'message' => $notificationData['data']['message'] ?? 'Please verify your email address to complete your registration.',
            'link' => $notificationData['data']['verificationUrl'] ?? null,
            'data' => $cleanData,
        ]);

        // Dispatch our email job for proper logging and error handling
        SendNotificationEmail::dispatch(
            $notifiable,
            $notificationData['type'],
            $notificationData['data'],
            $notificationRecord->id,
            null
        );
    }
}
