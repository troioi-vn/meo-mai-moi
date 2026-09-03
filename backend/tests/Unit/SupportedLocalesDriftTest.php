<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * config('locales.supported') is the single source of truth for the backend
 * locale list. The OpenAPI enum on CreateTelegramLoginHandshakeController is
 * a PHP attribute and cannot call config() at compile time, so this test
 * fails on drift instead of letting the docs and the validator diverge.
 *
 * Uses a targeted regex over the controller file: instantiating the
 * attribute via reflection drops the nested content (swagger-php only wires
 * nesting during Analysis), so reflection cannot see the enum.
 */
class SupportedLocalesDriftTest extends TestCase
{
    #[Test]
    public function supported_set_is_exactly_the_four_locales(): void
    {
        /** @var array<string> $supported */
        $supported = config('locales.supported');

        $sorted = $supported;
        sort($sorted);

        $this->assertSame(['en', 'ru', 'uk', 'vi'], $sorted);
    }

    #[Test]
    public function telegram_handshake_openapi_enum_matches_config(): void
    {
        $source = (string) file_get_contents(
            app_path('Http/Controllers/Auth/CreateTelegramLoginHandshakeController.php')
        );

        $this->assertStringContainsString("property: 'locale'", $source);

        $matched = preg_match(
            "/property:\s*'locale'[^\\n]*?enum:\s*\[([^\]]*)\]/",
            $source,
            $matches
        );

        $this->assertSame(1, $matched, 'Could not find the locale enum in the handshake controller annotation.');

        preg_match_all("/'([A-Za-z_-]+)'/", $matches[1], $tokens);

        /** @var array<string> $supported */
        $supported = config('locales.supported');

        $enum = $tokens[1];
        sort($enum);
        $sorted = $supported;
        sort($sorted);

        $this->assertSame($sorted, $enum);
    }

    #[Test]
    public function no_hardcoded_locale_list_remains_outside_config_and_the_annotation(): void
    {
        $files = [
            app_path('Http/Controllers/Auth/CreateTelegramLoginHandshakeController.php'),
            app_path('Services/Telegram/TelegramLocaleService.php'),
            app_path('Services/Telegram/TelegramLoginLinkService.php'),
        ];

        foreach ($files as $file) {
            $source = (string) file_get_contents($file);

            $this->assertDoesNotMatchRegularExpression(
                "/'in:en,/",
                $source,
                "Hardcoded validation list in {$file}; build it from config('locales.supported') instead."
            );
            $this->assertDoesNotMatchRegularExpression(
                "/in_array\(\s*\\$\w+,\s*\['en'/",
                $source,
                "Hardcoded membership list in {$file}; read config('locales.supported') instead."
            );
        }

        foreach ([
            app_path('Services/Telegram/TelegramLocaleService.php'),
            app_path('Services/Telegram/TelegramLoginLinkService.php'),
        ] as $file) {
            $this->assertStringContainsString(
                "config('locales.supported'",
                (string) file_get_contents($file),
                "{$file} should derive the list from config."
            );
        }
    }
}
