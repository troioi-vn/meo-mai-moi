<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Jobs\SendNotificationEmail;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class EmailNotificationChannel implements NotificationChannelInterface
{
    public function send(User $user, string $type, array $data): bool
    {
        try {
            $notification = $this->createNotificationRecord($user, $type, $data);

            SendNotificationEmail::dispatch($user, $type, $data, $notification->id);

            $this->logSuccess($user, $notification, $type);

            return true;
        } catch (\Exception $e) {
            $this->logError($user, $type, $e);

            return false;
        }
    }

    public function getChannelName(): string
    {
        return 'email';
    }

    private function createNotificationRecord(User $user, string $type, array $data): Notification
    {
        return Notification::create([
            'user_id' => $user->id,
            'type' => $type,
            'message' => $data['message'] ?? '',
            'link' => $data['link'] ?? null,
            'data' => array_merge($data, ['channel' => $this->getChannelName()]),

        ]);
    }

    private function logSuccess(User $user, Notification $notification, string $type): void
    {
        Log::info('Email notification queued', [
            'user_id' => $user->id,
            'notification_id' => $notification->id,
            'type' => $type,
        ]);
    }

    private function logError(User $user, string $type, \Exception $e): void
    {
        Log::error('Failed to queue email notification', [
            'user_id' => $user->id,
            'type' => $type,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);
    }
}
