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
        private readonly TelegramLocaleService $localeService,
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
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function sendMessageWithWebAppButton(
        string $chatId,
        string $text,
        string $buttonText,
        ?string $redirectPath = null,
    ): void {
        $redirectPath = $this->frontendPathService->sanitize($redirectPath);

        try {
            $webAppUrl = $this->buildWebAppUrl($redirectPath);

            $this->telegramClient()->sendMessage([
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode($this->webAppKeyboard($buttonText, $webAppUrl)),
            ]);

            $this->setChatMenuButton($chatId, $buttonText, $this->buildWebAppUrl(null));
        } catch (\Exception $e) {
            Log::error('Failed to send Telegram message with web app button', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function sendLanguageSelection(string $chatId): void
    {
        try {
            $this->telegramClient()->sendMessage([
                'chat_id' => $chatId,
                'text' => $this->localeService->trans('choose_language'),
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode($this->languageSelectionKeyboard()),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send Telegram language selection', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function sendCreateAccountKeyboard(string $chatId, string $locale): void
    {
        try {
            $this->telegramClient()->sendMessage([
                'chat_id' => $chatId,
                'text' => $this->localeService->trans('welcome_new', ['app_name' => config('app.name', 'Meo Mai Moi')], $locale),
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode($this->createAccountKeyboard($locale)),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send Telegram create account keyboard', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function sendHandshakeCreateAccountKeyboard(string $chatId, string $locale, string $userCode): void
    {
        try {
            $this->telegramClient()->sendMessage([
                'chat_id' => $chatId,
                'text' => $this->localeService->trans('browser_sign_in_new_account', ['code' => $userCode], $locale),
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode($this->createAccountKeyboard($locale)),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send Telegram handshake create account keyboard', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function sendHandshakeConfirmation(string $chatId, string $nonce, string $locale, string $userCode): void
    {
        try {
            $this->telegramClient()->sendMessage([
                'chat_id' => $chatId,
                'text' => $this->localeService->trans('browser_sign_in_confirmation', ['code' => $userCode], $locale),
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode($this->handshakeConfirmationKeyboard($nonce, $locale)),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send Telegram handshake confirmation', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function sendMessageWithUrlButton(string $chatId, string $text, string $buttonText, string $url): void
    {
        try {
            $this->telegramClient()->sendMessage([
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode($this->urlKeyboard($buttonText, $url)),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send Telegram message with URL button', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function answerCallbackQuery(string $callbackQueryId, ?string $text = null): void
    {
        try {
            $botToken = config('telegram.user_bot.token');
            if (! $botToken) {
                return;
            }

            $params = ['callback_query_id' => $callbackQueryId];
            if ($text !== null) {
                $params['text'] = $text;
            }

            Http::post("https://api.telegram.org/bot{$botToken}/answerCallbackQuery", $params);
        } catch (\Exception $e) {
            Log::error('Failed to answer callback query', [
                'callback_query_id' => $callbackQueryId,
                'error' => $e->getMessage(),
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
                'error' => $e->getMessage(),
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
    private function webAppKeyboard(string $buttonText, string $webAppUrl): array
    {
        return [
            'inline_keyboard' => [
                [
                    ['text' => $buttonText, 'web_app' => ['url' => $webAppUrl]],
                ],
            ],
        ];
    }

    /** @return array{inline_keyboard: list<list<array<string, string>>>} */
    private function handshakeConfirmationKeyboard(string $nonce, string $locale): array
    {
        return [
            'inline_keyboard' => [
                [
                    ['text' => $this->localeService->trans('confirm_browser_sign_in_button', [], $locale), 'callback_data' => "hs_ok_{$nonce}"],
                    ['text' => $this->localeService->trans('cancel_browser_sign_in_button', [], $locale), 'callback_data' => "hs_no_{$nonce}"],
                ],
            ],
        ];
    }

    /** @return array{inline_keyboard: list<list<array<string, string>>>} */
    private function urlKeyboard(string $buttonText, string $url): array
    {
        return [
            'inline_keyboard' => [
                [
                    ['text' => $buttonText, 'url' => $url],
                ],
            ],
        ];
    }

    /** @return array{inline_keyboard: list<list<array<string, string>>>} */
    private function languageSelectionKeyboard(): array
    {
        return [
            'inline_keyboard' => [
                [
                    ['text' => '🇬🇧 English', 'callback_data' => 'lang_en'],
                    ['text' => '🇷🇺 Русский', 'callback_data' => 'lang_ru'],
                ],
                [
                    ['text' => '🇺🇦 Українська', 'callback_data' => 'lang_uk'],
                    ['text' => '🇻🇳 Tiếng Việt', 'callback_data' => 'lang_vi'],
                ],
            ],
        ];
    }

    /** @return array{inline_keyboard: list<list<array<string, string>>>} */
    private function createAccountKeyboard(string $locale): array
    {
        return [
            'inline_keyboard' => [
                [
                    ['text' => $this->localeService->trans('create_account_button', [], $locale), 'callback_data' => 'create_account'],
                ],
            ],
        ];
    }
}
