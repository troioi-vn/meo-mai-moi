<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

class TelegramLocaleService
{
    public const LANGUAGE_OPTIONS = [
        'lang_en' => ['locale' => 'en', 'label' => 'English'],
        'lang_ru' => ['locale' => 'ru', 'label' => 'Русский'],
        'lang_uk' => ['locale' => 'uk', 'label' => 'Українська'],
        'lang_vi' => ['locale' => 'vi', 'label' => 'Tiếng Việt'],
    ];

    /**
     * Resolve bot locale in this order: linked user, browser handshake, explicit
     * cached picker choice, Telegram's language_code, then the app default.
     */
    public function resolve(
        string $chatId,
        ?User $user = null,
        mixed $handshakeLocale = null,
        mixed $telegramLanguageCode = null,
    ): string {
        $locale = $this->resolveKnown($chatId, $user, $handshakeLocale, $telegramLanguageCode)
            ?? $this->normalize(config('app.locale', 'en'))
            ?? 'en';

        $this->cache($chatId, $locale);

        return $locale;
    }

    public function resolveKnown(
        string $chatId,
        ?User $user,
        mixed $handshakeLocale,
        mixed $telegramLanguageCode,
    ): ?string {
        $candidates = [
            $user?->locale,
            $handshakeLocale,
            Cache::get("telegram-locale:{$chatId}"),
            $telegramLanguageCode,
        ];

        foreach ($candidates as $candidate) {
            $locale = $this->normalize($candidate);
            if ($locale !== null) {
                return $locale;
            }
        }

        return null;
    }

    public function cache(string $chatId, string $locale): void
    {
        Cache::put("telegram-locale:{$chatId}", $locale, now()->addDays(30));
    }

    /** @param array<string, mixed> $message */
    public function languageCodeFromMessage(array $message): mixed
    {
        $from = $message['from'] ?? null;

        return is_array($from) ? ($from['language_code'] ?? null) : null;
    }

    /** @param array<string, mixed> $replace */
    public function trans(string $key, array $replace = [], string $locale = 'en'): string
    {
        return __("messages.telegram.{$key}", $replace, $locale);
    }

    private function normalize(mixed $locale): ?string
    {
        if (! is_string($locale) || trim($locale) === '') {
            return null;
        }

        $normalized = strtolower(explode('-', str_replace('_', '-', trim($locale)), 2)[0]);

        return in_array($normalized, ['en', 'ru', 'uk', 'vi'], true) ? $normalized : null;
    }
}
