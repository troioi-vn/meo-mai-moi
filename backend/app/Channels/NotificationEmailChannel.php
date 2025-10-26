<?php

namespace App\Channels;

use App\Jobs\SendNotificationEmail;
use App\Models\Notification;
use Illuminate\Notifications\Notification as LaravelNotification;

class NotificationEmailChannel
{
    /**
     * Send the given notification.
     */
    public function send($notifiable, LaravelNotification $notification)
    {
        // Get the notification data from the notification class
        if (! method_exists($notification, 'toNotificationEmail')) {
            // This notification is not designed for the notification_email channel.
            // You can log an error here if you want.
            // For example: \Log::error('Notification of class '.get_class($notification).' is not emailable.');
            return;
        }
        $notificationData = $notification->toNotificationEmail($notifiable);

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
            $notificationRecord->id
        );
    }
}
