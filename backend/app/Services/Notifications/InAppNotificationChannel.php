<?php

namespace App\Services\Notifications;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class InAppNotificationChannel implements NotificationChannelInterface
{
    private bool $isFallback;

    public function __construct(bool $isFallback = false)
    {
        $this->isFallback = $isFallback;
    }

    public function send(User $user, string $type, array $data): bool
    {
        try {
            $processedData = $this->isFallback ? $this->prepareFallbackData($data) : $data;
            $notification = $this->createNotificationRecord($user, $type, $processedData);
            
            $notification->update(['delivered_at' => now()]);
            
            $this->logSuccess($user, $notification, $type);
            
            return true;
        } catch (\Exception $e) {
            $this->logError($user, $type, $e);
            return false;
        }
    }

    public function getChannelName(): string
    {
        return $this->isFallback ? 'in_app_fallback' : 'in_app';
    }

    private function prepareFallbackData(array $data): array
    {
        return array_merge($data, [
            'is_fallback' => true,
            'original_channel' => 'email',
            'fallback_reason' => 'Email delivery failed or not configured',
        ]);
    }

    private function createNotificationRecord(User $user, string $type, array $data): Notification
    {
        return Notification::create([
            'user_id' => $user->id,
            'type' => $type,
            'message' => $data['message'] ?? '',
            'link' => $data['link'] ?? null,
            'data' => array_merge($data, ['channel' => $this->getChannelName()]),
            'is_read' => false,
        ]);
    }

    private function logSuccess(User $user, Notification $notification, string $type): void
    {
        $message = $this->isFallback 
            ? 'Fallback in-app notification created'
            : 'In-app notification created';
            
        $context = [
            'user_id' => $user->id,
            'notification_id' => $notification->id,
            'type' => $type,
        ];

        if ($this->isFallback) {
            $context['reason'] = 'Email notification failed';
        }

        Log::info($message, $context);
    }

    private function logError(User $user, string $type, \Exception $e): void
    {
        $message = $this->isFallback 
            ? 'Failed to create fallback in-app notification'
            : 'Failed to create in-app notification';

        Log::error($message, [
            'user_id' => $user->id,
            'type' => $type,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);
    }
}