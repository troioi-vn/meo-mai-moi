<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\NotificationType;
use App\Models\NotificationPreference;
use App\Models\User;

class UnsubscribeService
{
    /**
     * Generate an unsubscribe token for a user and notification type.
     */
    public function generateToken(User $user, NotificationType $notificationType): string
    {
        return hash_hmac('sha256', $user->id.$notificationType->value, config('app.key'));
    }

    /**
     * Verify an unsubscribe token.
     */
    public function verifyToken(User $user, NotificationType $notificationType, string $token): bool
    {
        $expectedToken = $this->generateToken($user, $notificationType);

        return hash_equals($expectedToken, $token);
    }

    /**
     * Generate unsubscribe URL for a user and notification type.
     */
    public function generateUnsubscribeUrl(User $user, NotificationType $notificationType): string
    {
        $token = $this->generateToken($user, $notificationType);

        return config('app.url').'/unsubscribe?'.http_build_query([
            'user' => $user->id,
            'type' => $notificationType->value,
            'token' => $token,
        ]);
    }

    /**
     * Process unsubscribe request.
     */
    public function unsubscribe(int $userId, string $notificationType, string $token): bool
    {
        $user = User::find($userId);
        if (! $user) {
            return false;
        }

        $type = NotificationType::tryFrom($notificationType);
        if (! $type) {
            return false;
        }

        if (! $this->verifyToken($user, $type, $token)) {
            return false;
        }

        // Disable email notifications for this type
        NotificationPreference::updatePreference($user, $type->value, false, null);

        return true;
    }
}
