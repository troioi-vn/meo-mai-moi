<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\HelperContactDetailType;

class HelperContactDetails
{
    /**
     * @param  array<int, array{type?: mixed, value?: mixed}>|null  $contactDetails
     * @return array<string, string>
     */
    public static function validateMany(?array $contactDetails): array
    {
        if ($contactDetails === null) {
            return [];
        }

        $errors = [];
        $seenUniqueTypes = [];

        foreach ($contactDetails as $index => $contactDetail) {
            $typeValue = $contactDetail['type'] ?? null;
            $value = $contactDetail['value'] ?? null;

            if (! is_string($typeValue) || ! is_string($value)) {
                continue;
            }

            $type = HelperContactDetailType::tryFrom($typeValue);
            if (! $type) {
                continue;
            }

            if ($type->isUniquePerProfile()) {
                if (isset($seenUniqueTypes[$type->value])) {
                    $errors["contact_details.{$index}.type"] = 'This contact type can only be added once.';
                } else {
                    $seenUniqueTypes[$type->value] = true;
                }
            }

            if (self::normalizeValue($type, $value) === null) {
                $errors["contact_details.{$index}.value"] = self::invalidValueMessage($type);
            }
        }

        return $errors;
    }

    /**
     * @param  array<int, array{type: string, value: string}>|null  $contactDetails
     * @return array<int, array{type: string, value: string}>
     */
    public static function normalizeMany(?array $contactDetails): array
    {
        if (! $contactDetails) {
            return [];
        }

        $normalized = [];

        foreach ($contactDetails as $contactDetail) {
            $type = HelperContactDetailType::from($contactDetail['type']);
            $value = self::normalizeValue($type, $contactDetail['value']);

            if ($value === null) {
                continue;
            }

            $normalized[] = [
                'type' => $type->value,
                'value' => $value,
            ];
        }

        return $normalized;
    }

    private static function invalidValueMessage(HelperContactDetailType $type): string
    {
        return match ($type) {
            HelperContactDetailType::TELEGRAM => 'Enter a valid Telegram username or profile URL.',
            HelperContactDetailType::WHATSAPP => 'Enter a valid WhatsApp number or WhatsApp link.',
            HelperContactDetailType::FACEBOOK => 'Enter a valid Facebook username or Facebook profile URL.',
            HelperContactDetailType::INSTAGRAM => 'Enter a valid Instagram username or profile URL.',
            HelperContactDetailType::X_TWITTER => 'Enter a valid X username or profile URL.',
            HelperContactDetailType::LINKEDIN => 'Enter a valid LinkedIn profile slug or LinkedIn URL.',
            HelperContactDetailType::TIKTOK => 'Enter a valid TikTok username or profile URL.',
            HelperContactDetailType::WEBSITE => 'Enter a valid website URL.',
            HelperContactDetailType::EMAIL => 'Enter a valid email address.',
            default => 'Enter a valid contact value.',
        };
    }

    private static function normalizeValue(HelperContactDetailType $type, string $value): ?string
    {
        $trimmed = trim($value);

        if ($trimmed === '') {
            return null;
        }

        return match ($type) {
            HelperContactDetailType::TELEGRAM => self::normalizeTelegram($trimmed),
            HelperContactDetailType::WHATSAPP => self::normalizeWhatsapp($trimmed),
            HelperContactDetailType::FACEBOOK => self::normalizeFacebook($trimmed),
            HelperContactDetailType::INSTAGRAM => self::normalizeInstagram($trimmed),
            HelperContactDetailType::X_TWITTER => self::normalizeX($trimmed),
            HelperContactDetailType::LINKEDIN => self::normalizeLinkedin($trimmed),
            HelperContactDetailType::TIKTOK => self::normalizeTiktok($trimmed),
            HelperContactDetailType::WEBSITE => self::normalizeWebsite($trimmed),
            HelperContactDetailType::EMAIL => self::normalizeEmail($trimmed),
            HelperContactDetailType::ZALO,
            HelperContactDetailType::WECHAT,
            HelperContactDetailType::VIBER,
            HelperContactDetailType::LINE,
            HelperContactDetailType::OTHER => self::normalizePlainText($trimmed),
        };
    }

    private static function normalizePlainText(string $value): string
    {
        /** @var string $normalized */
        $normalized = preg_replace('/\s+/u', ' ', $value) ?? $value;

        return trim($normalized);
    }

    private static function normalizeTelegram(string $value): ?string
    {
        if (preg_match('/^@?([A-Za-z0-9_]{5,32})$/', $value, $matches) === 1) {
            return $matches[1];
        }

        if (preg_match('~^(?:https?://)?(?:t\.me|telegram\.me)/@?([A-Za-z0-9_]{5,32})/?$~i', $value, $matches) === 1) {
            return $matches[1];
        }

        return null;
    }

    private static function normalizeWhatsapp(string $value): ?string
    {
        $digitsOnly = preg_replace('/\D+/', '', $value) ?? '';
        if ($digitsOnly !== '' && preg_match('/^\d{7,15}$/', $digitsOnly) === 1) {
            return $digitsOnly;
        }

        if (preg_match('~^(?:https?://)?wa\.me/(\d{7,15})/?$~i', $value, $matches) === 1) {
            return $matches[1];
        }

        $parts = parse_url($value);
        if (($parts['host'] ?? null) && str_contains((string) ($parts['host'] ?? ''), 'whatsapp.com')) {
            parse_str($parts['query'] ?? '', $query);
            $phone = preg_replace('/\D+/', '', (string) ($query['phone'] ?? '')) ?? '';

            return preg_match('/^\d{7,15}$/', $phone) === 1 ? $phone : null;
        }

        return null;
    }

    private static function normalizeFacebook(string $value): ?string
    {
        if (preg_match('/^([A-Za-z0-9_.-]+)$/', $value, $matches) === 1) {
            return self::rejectReservedFacebookSegment($matches[1]);
        }

        if (preg_match('~^(?:https?://)?(?:www\.)?facebook\.com/([A-Za-z0-9_.-]+)/?$~i', $value, $matches) === 1) {
            return self::rejectReservedFacebookSegment($matches[1]);
        }

        return null;
    }

    private static function rejectReservedFacebookSegment(string $segment): ?string
    {
        $reserved = ['pages', 'groups', 'watch', 'marketplace', 'share', 'login', 'profile.php'];

        return in_array(strtolower($segment), $reserved, true) ? null : $segment;
    }

    private static function normalizeInstagram(string $value): ?string
    {
        if (preg_match('/^@?([A-Za-z0-9._]{1,30})$/', $value, $matches) === 1) {
            return $matches[1];
        }

        if (preg_match('~^(?:https?://)?(?:www\.)?instagram\.com/([A-Za-z0-9._]{1,30})/?$~i', $value, $matches) === 1) {
            return $matches[1];
        }

        return null;
    }

    private static function normalizeX(string $value): ?string
    {
        if (preg_match('/^@?([A-Za-z0-9_]{1,15})$/', $value, $matches) === 1) {
            return $matches[1];
        }

        if (preg_match('~^(?:https?://)?(?:www\.)?(?:x|twitter)\.com/([A-Za-z0-9_]{1,15})/?$~i', $value, $matches) === 1) {
            return $matches[1];
        }

        return null;
    }

    private static function normalizeLinkedin(string $value): ?string
    {
        if (preg_match('/^([A-Za-z0-9-]{3,100})$/', $value, $matches) === 1) {
            return $matches[1];
        }

        if (preg_match('~^(?:https?://)?(?:www\.)?linkedin\.com/in/([A-Za-z0-9-]{3,100})/?$~i', $value, $matches) === 1) {
            return $matches[1];
        }

        return null;
    }

    private static function normalizeTiktok(string $value): ?string
    {
        if (preg_match('/^@?([A-Za-z0-9._]{2,24})$/', $value, $matches) === 1) {
            return $matches[1];
        }

        if (preg_match('~^(?:https?://)?(?:www\.)?tiktok\.com/@([A-Za-z0-9._]{2,24})/?$~i', $value, $matches) === 1) {
            return $matches[1];
        }

        return null;
    }

    private static function normalizeWebsite(string $value): ?string
    {
        $candidate = $value;
        if (! preg_match('~^https?://~i', $candidate)) {
            $candidate = 'https://'.$candidate;
        }

        if (filter_var($candidate, FILTER_VALIDATE_URL) === false) {
            return null;
        }

        $scheme = parse_url($candidate, PHP_URL_SCHEME);
        if (! in_array($scheme, ['http', 'https'], true)) {
            return null;
        }

        return $candidate;
    }

    private static function normalizeEmail(string $value): ?string
    {
        $normalized = filter_var($value, FILTER_VALIDATE_EMAIL);

        return $normalized === false ? null : strtolower($normalized);
    }
}
