<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\Telegram\TelegramTokenRedactor;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TelegramTokenRedactorTest extends TestCase
{
    #[Test]
    public function it_redacts_the_token_from_a_bot_api_url(): void
    {
        $message = 'cURL error 28: Failed to connect to api.telegram.org port 443 after 135332 ms: '
            .'Could not connect to server for https://api.telegram.org/bot123456:FAKE_NOT_A_REAL_TOKEN/sendMessage';

        $redacted = TelegramTokenRedactor::redact($message);

        $this->assertStringNotContainsString('FAKE_NOT_A_REAL_TOKEN', $redacted);
        $this->assertStringContainsString('bot123456:[REDACTED]', $redacted);
        $this->assertStringContainsString('cURL error 28', $redacted);
    }

    #[Test]
    public function it_redacts_every_occurrence(): void
    {
        $message = 'https://api.telegram.org/bot111:AAA_secret/sendMessage and https://api.telegram.org/bot222:BBB-secret/setWebhook';

        $redacted = TelegramTokenRedactor::redact($message);

        $this->assertSame(
            'https://api.telegram.org/bot111:[REDACTED]/sendMessage and https://api.telegram.org/bot222:[REDACTED]/setWebhook',
            $redacted,
        );
    }

    #[Test]
    public function it_leaves_unrelated_text_untouched(): void
    {
        $message = 'Connection refused while talking to shared-postgres:5432';

        $this->assertSame($message, TelegramTokenRedactor::redact($message));
    }

    #[Test]
    public function it_redacts_strings_nested_in_a_log_context(): void
    {
        $context = [
            'chat_id' => '127529747',
            'error' => 'failed for https://api.telegram.org/bot999:TOPSECRET/sendMessage',
            'meta' => [
                'retry' => 2,
                'url' => 'https://api.telegram.org/bot999:TOPSECRET/getMe',
            ],
        ];

        $redacted = TelegramTokenRedactor::redactContext($context);

        $this->assertSame('127529747', $redacted['chat_id']);
        $this->assertSame('failed for https://api.telegram.org/bot999:[REDACTED]/sendMessage', $redacted['error']);
        $this->assertSame(2, $redacted['meta']['retry']);
        $this->assertSame('https://api.telegram.org/bot999:[REDACTED]/getMe', $redacted['meta']['url']);
    }
}
