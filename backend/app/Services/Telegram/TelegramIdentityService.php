<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Enums\NotificationType;
use App\Models\NotificationPreference;
use App\Models\User;

class TelegramIdentityService
{
    public function findUser(int $telegramUserId, string $chatId): ?User
    {
        return User::where('telegram_user_id', $telegramUserId)->first()
            ?? User::where('telegram_chat_id', $chatId)
                ->whereNull('telegram_user_id')
                ->first();
    }

    public function linkExistingUser(User $user, string $chatId, int $telegramUserId): void
    {
        $this->unlinkFromOtherUsers($user, $chatId, $telegramUserId);

        $user->update([
            'telegram_chat_id' => $chatId,
            'telegram_user_id' => $telegramUserId,
        ]);

        $this->enableNotifications($user);
    }

    public function enableNotifications(User $user): void
    {
        foreach (NotificationType::cases() as $notificationType) {
            if ($notificationType === NotificationType::EMAIL_VERIFICATION) {
                continue;
            }

            NotificationPreference::updatePreference(
                $user,
                $notificationType->value,
                null,
                null,
                true
            );
        }
    }

    public function unlinkFromOtherUsers(User $targetUser, string $chatId, ?int $telegramUserId): void
    {
        User::query()
            ->where('id', '!=', $targetUser->id)
            ->where(function ($query) use ($chatId, $telegramUserId): void {
                $query->where('telegram_chat_id', $chatId);

                if ($telegramUserId !== null) {
                    $query->orWhere('telegram_user_id', $telegramUserId);
                }
            })
            ->update([
                'telegram_chat_id' => null,
                'telegram_user_id' => null,
                'telegram_username' => null,
                'telegram_first_name' => null,
                'telegram_last_name' => null,
                'telegram_photo_url' => null,
                'telegram_last_authenticated_at' => null,
            ]);
    }

    /**
     * @param  array<string, mixed>  $telegramFrom
     * @return array{
     *   telegram_user_id:int,
     *   telegram_username:?string,
     *   telegram_first_name:?string,
     *   telegram_last_name:?string,
     *   telegram_photo_url:null,
     *   auth_date:int
     * }
     */
    public function dataFromMessageUser(array $telegramFrom): array
    {
        return [
            'telegram_user_id' => (int) $telegramFrom['id'],
            'telegram_username' => $this->nullableString($telegramFrom['username'] ?? null),
            'telegram_first_name' => $this->nullableString($telegramFrom['first_name'] ?? null),
            'telegram_last_name' => $this->nullableString($telegramFrom['last_name'] ?? null),
            'telegram_photo_url' => null,
            'auth_date' => time(),
        ];
    }

    public function nullableString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
