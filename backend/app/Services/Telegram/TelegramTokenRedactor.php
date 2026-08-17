<?php

declare(strict_types=1);

namespace App\Services\Telegram;

/**
 * The Bot API carries the bot token in the request path, so anything that
 * echoes a Telegram URL — a cURL failure, a Guzzle exception, a stack frame —
 * spills the token verbatim. Scrub it before it reaches a log or the error sink.
 */
final class TelegramTokenRedactor
{
    /**
     * Matches the `bot<id>:<secret>` path segment. The numeric id is kept so a
     * redacted line still says which bot failed.
     */
    private const PATTERN = '#\bbot(\d+):[A-Za-z0-9_-]+#';

    public static function redact(string $value): string
    {
        return preg_replace(self::PATTERN, 'bot$1:[REDACTED]', $value) ?? $value;
    }

    /**
     * Walk a log context, redacting every string it holds.
     *
     * @param  array<array-key, mixed>  $context
     * @return array<array-key, mixed>
     */
    public static function redactContext(array $context): array
    {
        foreach ($context as $key => $value) {
            if (is_string($value)) {
                $context[$key] = self::redact($value);
            } elseif (is_array($value)) {
                $context[$key] = self::redactContext($value);
            }
        }

        return $context;
    }
}
