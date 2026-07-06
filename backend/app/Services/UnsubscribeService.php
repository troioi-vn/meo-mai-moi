<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\NotificationType;
use App\Enums\UnsubscribeChannel;
use App\Enums\UnsubscribeScope;
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
     * Process unsubscribe request (defaults to all email notifications).
     */
    public function unsubscribe(
        int $userId,
        string $notificationType,
        string $token,
        UnsubscribeChannel $channel = UnsubscribeChannel::EMAIL,
        UnsubscribeScope $scope = UnsubscribeScope::ALL,
    ): bool {
        $user = User::find($userId);
        if (! $user) {
            return false;
        }

        $type = NotificationType::tryFrom($notificationType);
        if (! $type) {
            return false;
        }

        return $this->unsubscribeFromChannel($userId, $channel, $scope, $token, $type);
    }

    /**
     * Unsubscribe a user from notifications on a specific channel.
     */
    public function unsubscribeFromChannel(
        int $userId,
        UnsubscribeChannel $channel,
        UnsubscribeScope $scope,
        string $token,
        ?NotificationType $originatingType,
    ): bool {
        $user = User::find($userId);
        if (! $user || $originatingType === null) {
            return false;
        }

        if (! $this->verifyToken($user, $originatingType, $token)) {
            return false;
        }

        if ($scope === UnsubscribeScope::ALL) {
            NotificationPreference::disableChannelForAllTypes($user, $channel);

            return true;
        }

        match ($channel) {
            UnsubscribeChannel::EMAIL => NotificationPreference::updatePreference($user, $originatingType->value, false, null),
            UnsubscribeChannel::IN_APP => NotificationPreference::updatePreference($user, $originatingType->value, null, false),
            UnsubscribeChannel::TELEGRAM => NotificationPreference::updatePreference($user, $originatingType->value, null, null, false),
        };

        return true;
    }
}
