<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Settings;
use Illuminate\Support\Facades\Cache;

class TelegramLoginWidgetAuthService
{
    private const AUTH_MAX_AGE_SECONDS = 600;

    private const REPLAY_WINDOW_SECONDS = 30;

    /**
     * Verify Telegram Login Widget callback data.
     *
     * @param  array<string, mixed>  $widgetData  Keys: id, first_name, last_name, username, photo_url, auth_date, hash
     * @return array{
     *   telegram_user_id: int,
     *   telegram_username: ?string,
     *   telegram_first_name: ?string,
     *   telegram_last_name: ?string,
     *   telegram_photo_url: ?string,
     *   auth_date: int,
     * }
     */
    public function verify(array $widgetData): array
    {
        $hash = $widgetData['hash'] ?? null;
        if (! is_string($hash) || $hash === '') {
            throw new \InvalidArgumentException('Missing Telegram hash.');
        }

        $botToken = Settings::get('telegram_bot_token') ?: config('services.telegram-bot-api.token');
        if (! is_string($botToken) || $botToken === '') {
            throw new \RuntimeException('Telegram bot token is not configured.');
        }

        $computedHash = $this->computeHash($widgetData, $botToken);
        if (! hash_equals($computedHash, $hash)) {
            throw new \InvalidArgumentException('Invalid Telegram signature.');
        }

        $authDate = isset($widgetData['auth_date']) ? (int) $widgetData['auth_date'] : 0;
        if ($authDate <= 0) {
            throw new \InvalidArgumentException('Missing Telegram auth_date.');
        }

        if ((time() - $authDate) > self::AUTH_MAX_AGE_SECONDS) {
            throw new \InvalidArgumentException('Telegram auth data expired.');
        }

        $this->guardAgainstReplay($hash);

        $telegramUserId = isset($widgetData['id']) ? (int) $widgetData['id'] : 0;
        if ($telegramUserId <= 0) {
            throw new \InvalidArgumentException('Invalid Telegram user ID.');
        }

        return [
            'telegram_user_id' => $telegramUserId,
            'telegram_username' => $this->nullableString($widgetData['username'] ?? null),
            'telegram_first_name' => $this->nullableString($widgetData['first_name'] ?? null),
            'telegram_last_name' => $this->nullableString($widgetData['last_name'] ?? null),
            'telegram_photo_url' => $this->nullableString($widgetData['photo_url'] ?? null),
            'auth_date' => $authDate,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function computeHash(array $data, string $botToken): string
    {
        unset($data['hash']);

        // Remove non-Telegram fields (e.g. invitation_code)
        unset($data['invitation_code']);

        ksort($data);

        $parts = [];
        foreach ($data as $key => $value) {
            if ($value === null) {
                continue;
            }
            $parts[] = sprintf('%s=%s', $key, $value);
        }

        $checkString = implode("\n", $parts);

        // Login Widget uses SHA256(bot_token) as secret — different from Mini App
        $secretKey = hash('sha256', $botToken, true);

        return hash_hmac('sha256', $checkString, $secretKey);
    }

    private function guardAgainstReplay(string $hash): void
    {
        $cacheKey = 'telegram-widget:replay:'.sha1($hash);

        if (! Cache::add($cacheKey, true, self::REPLAY_WINDOW_SECONDS)) {
            throw new \InvalidArgumentException('Duplicate Telegram auth payload.');
        }
    }

    private function nullableString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
