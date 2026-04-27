<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramWebhookService
{
    /**
     * Register the Telegram webhook for the given bot token.
     *
     * @return array{ok: bool, description: string}
     */
    public function register(?string $token = null): array
    {
        $token ??= config('telegram.user_bot.token');
        $secretToken = (string) config('telegram.user_bot.webhook_secret_token', '');

        if (! $token) {
            return ['ok' => false, 'description' => 'No Telegram bot token configured.'];
        }

        $webhookUrl = rtrim((string) config('app.url'), '/').'/api/webhooks/telegram';

        $payload = [
            'url' => $webhookUrl,
            'allowed_updates' => ['message', 'callback_query'],
        ];

        if ($secretToken !== '') {
            $payload['secret_token'] = $secretToken;
        }

        $response = Http::post("https://api.telegram.org/bot{$token}/setWebhook", $payload);

        $result = $response->json();

        if ($result['ok'] ?? false) {
            Log::info('Telegram webhook registered', ['url' => $webhookUrl]);
        } else {
            Log::error('Failed to register Telegram webhook', ['response' => $result]);
        }

        return [
            'ok' => $result['ok'] ?? false,
            'description' => $result['description'] ?? 'Unknown error',
        ];
    }

    /**
     * Remove the Telegram webhook.
     *
     * @return array{ok: bool, description: string}
     */
    public function remove(?string $token = null): array
    {
        $token ??= config('telegram.user_bot.token');

        if (! $token) {
            return ['ok' => false, 'description' => 'No Telegram bot token configured.'];
        }

        $response = Http::post("https://api.telegram.org/bot{$token}/deleteWebhook");

        $result = $response->json();

        return [
            'ok' => $result['ok'] ?? false,
            'description' => $result['description'] ?? 'Unknown error',
        ];
    }

    /**
     * Get current webhook info.
     *
     * @return array<string, mixed>
     */
    public function getInfo(?string $token = null): array
    {
        $token ??= config('telegram.user_bot.token');

        if (! $token) {
            return ['ok' => false, 'description' => 'No Telegram bot token configured.'];
        }

        $response = Http::get("https://api.telegram.org/bot{$token}/getWebhookInfo");

        return $response->json() ?? [];
    }
}
