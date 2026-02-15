<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Settings;
use Illuminate\Support\Facades\Cache;

class TelegramMiniAppAuthService
{
    private const AUTH_MAX_AGE_SECONDS = 600;

    private const REPLAY_WINDOW_SECONDS = 30;

    /**
     * @return array{
     *   telegram_user_id:int,
     *   telegram_username:?string,
     *   telegram_first_name:?string,
     *   telegram_last_name:?string,
     *   telegram_photo_url:?string,
     *   auth_date:int,
     *   query_id:?string
     * }
     */
    public function verify(string $initData): array
    {
        $data = $this->parseInitData($initData);

        $hash = $data['hash'] ?? null;
        if (! is_string($hash) || $hash === '') {
            throw new \InvalidArgumentException('Missing Telegram hash.');
        }

        $botToken = Settings::get('telegram_bot_token') ?: config('services.telegram-bot-api.token');
        if (! is_string($botToken) || $botToken === '') {
            throw new \RuntimeException('Telegram bot token is not configured.');
        }

        $computedHash = $this->computeHash($data, $botToken);
        if (! hash_equals($computedHash, $hash)) {
            throw new \InvalidArgumentException('Invalid Telegram signature.');
        }

        $authDate = isset($data['auth_date']) ? (int) $data['auth_date'] : 0;
        if ($authDate <= 0) {
            throw new \InvalidArgumentException('Missing Telegram auth_date.');
        }

        if ((time() - $authDate) > self::AUTH_MAX_AGE_SECONDS) {
            throw new \InvalidArgumentException('Telegram auth data expired.');
        }

        $this->guardAgainstRapidReplay($data, $hash);

        $userPayload = $this->decodeUserPayload($data['user'] ?? null);
        $telegramUserId = isset($userPayload['id']) ? (int) $userPayload['id'] : 0;
        if ($telegramUserId <= 0) {
            throw new \InvalidArgumentException('Invalid Telegram user payload.');
        }

        return [
            'telegram_user_id' => $telegramUserId,
            'telegram_username' => $this->nullableString($userPayload['username'] ?? null),
            'telegram_first_name' => $this->nullableString($userPayload['first_name'] ?? null),
            'telegram_last_name' => $this->nullableString($userPayload['last_name'] ?? null),
            'telegram_photo_url' => $this->nullableString($userPayload['photo_url'] ?? null),
            'auth_date' => $authDate,
            'query_id' => $this->nullableString($data['query_id'] ?? null),
        ];
    }

    /**
     * @return array<string, string>
     */
    private function parseInitData(string $initData): array
    {
        if ($initData === '') {
            throw new \InvalidArgumentException('Missing initData.');
        }

        $pairs = explode('&', $initData);
        $data = [];

        foreach ($pairs as $pair) {
            if ($pair === '' || ! str_contains($pair, '=')) {
                continue;
            }

            [$rawKey, $rawValue] = explode('=', $pair, 2);
            $key = rawurldecode($rawKey);
            $value = rawurldecode($rawValue);

            if ($key !== '') {
                $data[$key] = $value;
            }
        }

        return $data;
    }

    /**
     * @param array<string, string> $data
     */
    private function computeHash(array $data, string $botToken): string
    {
        unset($data['hash']);

        ksort($data);

        $checkStringParts = [];
        foreach ($data as $key => $value) {
            $checkStringParts[] = sprintf('%s=%s', $key, $value);
        }

        $checkString = implode("\n", $checkStringParts);

        $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);

        return hash_hmac('sha256', $checkString, $secretKey);
    }

    /**
     * @param string|null $rawUser
     *
     * @return array<string, mixed>
     */
    private function decodeUserPayload(?string $rawUser): array
    {
        if (! is_string($rawUser) || $rawUser === '') {
            return [];
        }

        $decoded = json_decode($rawUser, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param array<string, string> $data
     */
    private function guardAgainstRapidReplay(array $data, string $hash): void
    {
        $queryId = $this->nullableString($data['query_id'] ?? null);
        $replaySeed = $queryId ?: $hash;

        $cacheKey = 'telegram-miniapp:replay:'.sha1($replaySeed);

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
