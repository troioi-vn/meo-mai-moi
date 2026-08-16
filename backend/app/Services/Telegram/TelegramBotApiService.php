<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Services\FrontendPathService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use NotificationChannels\Telegram\Telegram;

class TelegramBotApiService
{
    public function __construct(
        private readonly FrontendPathService $frontendPathService,
    ) {}

    public function sendMessage(string $chatId, string $text): void
    {
        try {
            $this->telegramClient()->sendMessage([
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => 'HTML',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send Telegram message', [
                'chat_id' => $chatId,
                'error' => TelegramTokenRedactor::redact($e->getMessage()),
            ]);
        }
    }

    public function sendMessageWithLoginOptions(
        string $chatId,
        string $text,
        string $browserButtonText,
        string $returnUrl,
        string $webAppButtonText,
        ?string $redirectPath,
    ): void {
        try {
            $this->telegramClient()->sendMessage([
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode($this->loginOptionsKeyboard(
                    $browserButtonText,
                    $returnUrl,
                    $webAppButtonText,
                    $this->buildWebAppUrl($this->frontendPathService->sanitize($redirectPath)),
                )),
            ]);
            $this->setChatMenuButton($chatId, $webAppButtonText, $this->buildWebAppUrl(null));
        } catch (\Exception $e) {
            Log::error('Failed to send Telegram message with login options', [
                'chat_id' => $chatId,
                'error' => TelegramTokenRedactor::redact($e->getMessage()),
            ]);
        }
    }

    private function setChatMenuButton(string $chatId, string $text, string $webAppUrl): void
    {
        try {
            $botToken = config('telegram.user_bot.token');
            if (! $botToken) {
                return;
            }

            Http::post("https://api.telegram.org/bot{$botToken}/setChatMenuButton", [
                'chat_id' => $chatId,
                'menu_button' => json_encode([
                    'type' => 'web_app',
                    'text' => $text,
                    'web_app' => ['url' => $webAppUrl],
                ]),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to set Telegram chat menu button', [
                'chat_id' => $chatId,
                'error' => TelegramTokenRedactor::redact($e->getMessage()),
            ]);
        }
    }

    private function telegramClient(): Telegram
    {
        $telegram = app(Telegram::class);
        $adminToken = config('telegram.user_bot.token');

        if ($adminToken) {
            $telegram->setToken($adminToken);
        }

        return $telegram;
    }

    private function buildWebAppUrl(?string $redirectPath): string
    {
        $frontendUrl = config('app.frontend_url', config('app.url', 'http://localhost:5173'));
        $webAppUrl = rtrim((string) $frontendUrl, '/').($redirectPath ?? '');
        $webAppUrl = preg_replace('/^http:\/\//', 'https://', $webAppUrl);

        return $webAppUrl;
    }

    /** @return array{inline_keyboard: list<list<array<string, mixed>>>} */
    private function loginOptionsKeyboard(string $browserButtonText, string $returnUrl, string $webAppButtonText, string $webAppUrl): array
    {
        return [
            'inline_keyboard' => [
                [
                    ['text' => $browserButtonText, 'url' => $returnUrl],
                    ['text' => $webAppButtonText, 'web_app' => ['url' => $webAppUrl]],
                ],
            ],
        ];
    }
}
