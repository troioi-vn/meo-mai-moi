<?php

declare(strict_types=1);

namespace App\Http\Controllers\Telegram;

use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Models\NotificationPreference;
use App\Models\Settings;
use App\Models\User;
use App\Services\TelegramUserAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use NotificationChannels\Telegram\Telegram;

class TelegramWebhookController extends Controller
{
    private const LANGUAGE_OPTIONS = [
        'lang_en' => ['locale' => 'en', 'label' => 'English'],
        'lang_ru' => ['locale' => 'ru', 'label' => 'Русский'],
        'lang_uk' => ['locale' => 'uk', 'label' => 'Українська'],
        'lang_vi' => ['locale' => 'vi', 'label' => 'Tiếng Việt'],
    ];

    public function __invoke(Request $request, TelegramUserAuthService $userAuthService): JsonResponse
    {
        $update = $request->all();

        Log::debug('Telegram webhook received', ['update' => $update]);

        $callbackQuery = $update['callback_query'] ?? null;
        if (is_array($callbackQuery)) {
            $this->handleCallbackQuery($callbackQuery, $userAuthService);

            return $this->okResponse();
        }

        $message = $update['message'] ?? null;
        if (! is_array($message)) {
            return $this->okResponse();
        }

        $chatId = $this->chatIdFromMessage($message);

        if ($chatId === null) {
            return $this->okResponse();
        }

        $text = is_string($message['text'] ?? null) ? $message['text'] : '';

        if (str_starts_with($text, '/start')) {
            $this->handleStartCommand($text, $chatId, $message, $userAuthService);
        }

        return $this->okResponse();
    }

    private function handleStartCommand(string $text, string $chatId, array $message, TelegramUserAuthService $userAuthService): void
    {
        $parts = explode(' ', $text, 2);
        $param = $parts[1] ?? null;
        $redirectPath = $this->resolveLoginRedirectPath($param, $chatId);

        // /start create_account — fallback flow when callback_query updates are unavailable
        if ($param === 'create_account') {
            $this->handleCreateAccountFromStart($chatId, $message, $userAuthService, $redirectPath);

            return;
        }

        // /start login — same flow as /start (no token), user came from web
        if (! $param || $param === 'login' || str_starts_with($param, 'login_')) {
            $this->handleStartWithoutToken($chatId, $message, $userAuthService, $redirectPath);

            return;
        }

        // /start <token> — linking from Settings → Account
        $user = User::where('telegram_link_token', $param)
            ->where('telegram_link_token_expires_at', '>', now())
            ->first();

        if (! $user) {
            $locale = $this->resolveLocale($chatId);
            $this->sendMessage($chatId, $this->trans('invalid_token', [
                'url' => config('app.url', 'https://meomaimoi.com'),
            ], $locale));

            return;
        }

        // Check if this chat is already linked to another user
        $existingUser = User::where('telegram_chat_id', $chatId)
            ->where('id', '!=', $user->id)
            ->first();

        if ($existingUser) {
            $existingUser->update(['telegram_chat_id' => null]);
        }

        $user->update([
            'telegram_chat_id' => $chatId,
            'telegram_link_token' => null,
            'telegram_link_token_expires_at' => null,
        ]);

        $this->enableTelegramNotifications($user);

        Log::info('Telegram linked to user', [
            'user_id' => $user->id,
            'chat_id' => $chatId,
        ]);

        $locale = $this->resolveLocale($chatId, $user);
        $this->sendMessageWithWebAppButton(
            $chatId,
            $this->trans('linked', ['app_name' => config('app.name', 'Meo Mai Moi')], $locale),
            $this->trans('open_app_button', [], $locale),
            $user
        );
    }

    private function handleStartWithoutToken(
        string $chatId,
        array $message,
        TelegramUserAuthService $userAuthService,
        ?string $redirectPath = null
    ): void {
        $telegramFrom = $message['from'] ?? null;
        if (! $telegramFrom || ! isset($telegramFrom['id'])) {
            $locale = $this->resolveLocale($chatId);
            $this->sendMessage($chatId, $this->trans('no_token', [
                'app_name' => config('app.name', 'Meo Mai Moi'),
                'url' => config('app.url', 'https://meomaimoi.com'),
            ], $locale));

            return;
        }

        $existingUser = $this->findTelegramUser((int) $telegramFrom['id'], $chatId);

        if ($existingUser) {
            $this->linkExistingTelegramUser($existingUser, $chatId, (int) $telegramFrom['id']);
            $this->sendAlreadyLinkedMessage($chatId, $existingUser, $redirectPath);

            return;
        }

        $this->sendLanguageSelection($chatId);
    }

    private function handleCreateAccountFromStart(
        string $chatId,
        array $message,
        TelegramUserAuthService $userAuthService,
        ?string $redirectPath = null
    ): void {
        $telegramFrom = $message['from'] ?? null;
        if (! $telegramFrom || ! isset($telegramFrom['id'])) {
            $locale = $this->resolveLocale($chatId);
            $this->sendMessage($chatId, $this->trans('identify_error', [], $locale));

            return;
        }

        $this->handleCreateAccount($chatId, null, $telegramFrom, $userAuthService, $redirectPath);
    }

    private function handleCallbackQuery(array $callbackQuery, TelegramUserAuthService $userAuthService): void
    {
        $callbackData = $callbackQuery['data'] ?? '';
        $callbackQueryId = $callbackQuery['id'] ?? '';
        $chatId = (string) ($callbackQuery['message']['chat']['id'] ?? '');
        $telegramFrom = $callbackQuery['from'] ?? null;

        if (! $chatId || ! $telegramFrom) {
            return;
        }

        // Handle language selection callbacks
        if (isset(self::LANGUAGE_OPTIONS[$callbackData])) {
            $this->handleLanguageSelection($chatId, $callbackQueryId, $callbackData);

            return;
        }

        if ($callbackData === 'create_account') {
            $this->handleCreateAccount($chatId, $callbackQueryId, $telegramFrom, $userAuthService);
        } else {
            $this->answerCallbackQuery($callbackQueryId);
        }
    }

    private function handleLanguageSelection(string $chatId, string $callbackQueryId, string $callbackData): void
    {
        $locale = self::LANGUAGE_OPTIONS[$callbackData]['locale'];

        Cache::put("telegram-locale:{$chatId}", $locale, now()->addDays(30));

        $this->answerCallbackQuery($callbackQueryId);

        $this->sendCreateAccountKeyboard($chatId, $locale);
    }

    private function handleCreateAccount(
        string $chatId,
        ?string $callbackQueryId,
        array $telegramFrom,
        TelegramUserAuthService $userAuthService,
        ?string $redirectPath = null
    ): void {
        $locale = $this->resolveLocale($chatId);
        $redirectPath ??= $this->consumeStoredLoginRedirectPath($chatId);

        if ($this->isInviteOnlyEnabled()) {
            $this->sendInviteOnlyMessage($chatId, $callbackQueryId, $locale);

            return;
        }

        $telegramData = $this->telegramDataFromMessageUser($telegramFrom);

        $existing = User::where('telegram_user_id', $telegramData['telegram_user_id'])->first();
        if ($existing) {
            $this->completeExistingAccountFlow($existing, $chatId, $callbackQueryId, $locale, $redirectPath);

            return;
        }

        $result = $userAuthService->findOrCreateAndLogin($telegramData, null, new \Illuminate\Http\Request(), $locale);

        if ($result['invite_only_blocked']) {
            $this->sendInviteOnlyMessage($chatId, $callbackQueryId, $locale);

            return;
        }

        $user = $result['user'];
        $this->completeNewAccountFlow($user, $chatId, $callbackQueryId, $locale, $redirectPath);
    }

    private function resolveLocale(string $chatId, ?User $user = null): string
    {
        if ($user !== null && $user->locale) {
            return $user->locale;
        }

        return Cache::get("telegram-locale:{$chatId}", config('app.locale', 'en'));
    }

    /**
     * Translate a Telegram bot message key.
     */
    private function trans(string $key, array $replace = [], string $locale = 'en'): string
    {
        return __("messages.telegram.{$key}", $replace, $locale);
    }

    private function enableTelegramNotifications(User $user): void
    {
        foreach (NotificationType::cases() as $notificationType) {
            if ($notificationType === NotificationType::EMAIL_VERIFICATION) {
                continue;
            }

            NotificationPreference::updatePreference(
                $user,
                $notificationType->value,
                null,
                null,
                true
            );
        }
    }

    private function sendMessage(string $chatId, string $text): void
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

    private function sendMessageWithWebAppButton(
        string $chatId,
        string $text,
        string $buttonText,
        ?User $user = null,
        ?string $redirectPath = null
    ): void {
        $redirectPath = $this->sanitizeFrontendPath($redirectPath);

        try {
            $webAppUrl = $this->buildWebAppUrl($user, $redirectPath);
            $escapedWebAppUrl = htmlspecialchars($webAppUrl, ENT_QUOTES, 'UTF-8');
            $text = str_replace(':web_app_url', $escapedWebAppUrl, $text);

            $this->telegramClient()->sendMessage([
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode($this->webAppKeyboard($buttonText, $webAppUrl)),
            ]);

            $this->setChatMenuButton($chatId, $buttonText, $webAppUrl);
        } catch (\Exception $e) {
            Log::error('Failed to send Telegram message with web app button', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function resolveLoginRedirectPath(?string $param, string $chatId): ?string
    {
        if (! is_string($param) || ! str_starts_with($param, 'login_')) {
            return null;
        }

        $redirectToken = substr($param, strlen('login_'));
        if ($redirectToken === '') {
            return null;
        }

        $redirectPath = Cache::get("telegram-login-redirect:{$redirectToken}");
        $redirectPath = $this->sanitizeFrontendPath(is_string($redirectPath) ? $redirectPath : null);

        if ($redirectPath !== null) {
            Cache::put("telegram-login-redirect-chat:{$chatId}", $redirectPath, now()->addMinutes(30));
        }

        return $redirectPath;
    }

    private function consumeStoredLoginRedirectPath(string $chatId): ?string
    {
        $redirectPath = Cache::pull("telegram-login-redirect-chat:{$chatId}");

        return $this->sanitizeFrontendPath(is_string($redirectPath) ? $redirectPath : null);
    }

    private function sanitizeFrontendPath(?string $path): ?string
    {
        if (! is_string($path) || $path === '') {
            return null;
        }

        if (! str_starts_with($path, '/') || str_starts_with($path, '//') || preg_match('#^https?://#i', $path)) {
            return null;
        }

        return $path;
    }

    private function setChatMenuButton(string $chatId, string $text, string $webAppUrl): void
    {
        try {
            $botToken = Settings::get('telegram_bot_token') ?: config('services.telegram-bot-api.token');
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

    private function sendLanguageSelection(string $chatId): void
    {
        try {
            $this->telegramClient()->sendMessage([
                'chat_id' => $chatId,
                'text' => $this->trans('choose_language'),
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

    private function sendCreateAccountKeyboard(string $chatId, string $locale): void
    {
        try {
            $this->telegramClient()->sendMessage([
                'chat_id' => $chatId,
                'text' => $this->trans('welcome_new', ['app_name' => config('app.name', 'Meo Mai Moi')], $locale),
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

    private function answerCallbackQuery(string $callbackQueryId, ?string $text = null): void
    {
        try {
            $botToken = Settings::get('telegram_bot_token') ?: config('services.telegram-bot-api.token');
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

    private function nullableString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function okResponse(): JsonResponse
    {
        return response()->json(['ok' => true]);
    }

    private function chatIdFromMessage(array $message): ?string
    {
        $chatId = $message['chat']['id'] ?? null;

        return $chatId === null ? null : (string) $chatId;
    }

    private function findTelegramUser(int $telegramUserId, string $chatId): ?User
    {
        return User::where('telegram_user_id', $telegramUserId)->first()
            ?? User::where('telegram_chat_id', $chatId)
            ->whereNull('telegram_user_id')
            ->first();
    }

    private function linkExistingTelegramUser(User $user, string $chatId, int $telegramUserId): void
    {
        $user->update([
            'telegram_chat_id' => $chatId,
            'telegram_user_id' => $telegramUserId,
        ]);

        $this->enableTelegramNotifications($user);
    }

    private function sendAlreadyLinkedMessage(string $chatId, User $user, ?string $redirectPath): void
    {
        $locale = $this->resolveLocale($chatId, $user);

        $this->sendMessageWithWebAppButton(
            $chatId,
            $this->trans('already_linked', ['app_name' => config('app.name', 'Meo Mai Moi')], $locale),
            $this->trans('open_app_button', [], $locale),
            $user,
            $redirectPath
        );
    }

    private function isInviteOnlyEnabled(): bool
    {
        return filter_var(Settings::get('invite_only_enabled', false), FILTER_VALIDATE_BOOLEAN);
    }

    private function sendInviteOnlyMessage(string $chatId, ?string $callbackQueryId, string $locale): void
    {
        if ($callbackQueryId !== null) {
            $this->answerCallbackQuery($callbackQueryId, $this->trans('invite_only_short', [], $locale));
        }

        $this->sendMessage($chatId, $this->trans('invite_only', [], $locale));
    }

    /**
     * @return array{
     *   telegram_user_id:int,
     *   telegram_username:?string,
     *   telegram_first_name:?string,
     *   telegram_last_name:?string,
     *   telegram_photo_url:null,
     *   auth_date:int
     * }
     */
    private function telegramDataFromMessageUser(array $telegramFrom): array
    {
        return [
            'telegram_user_id' => (int) $telegramFrom['id'],
            'telegram_username' => $this->nullableString($telegramFrom['username'] ?? null),
            'telegram_first_name' => $this->nullableString($telegramFrom['first_name'] ?? null),
            'telegram_last_name' => $this->nullableString($telegramFrom['last_name'] ?? null),
            'telegram_photo_url' => null,
            'auth_date' => time(),
        ];
    }

    private function completeExistingAccountFlow(
        User $user,
        string $chatId,
        ?string $callbackQueryId,
        string $locale,
        ?string $redirectPath
    ): void {
        $user->update(['telegram_chat_id' => $chatId]);
        $this->enableTelegramNotifications($user);
        $this->acknowledgeCallbackQuery($callbackQueryId);
        $this->sendMessageWithWebAppButton(
            $chatId,
            $this->trans('account_found', [], $locale),
            $this->trans('open_app_button', [], $locale),
            $user,
            $redirectPath
        );
    }

    private function completeNewAccountFlow(
        User $user,
        string $chatId,
        ?string $callbackQueryId,
        string $locale,
        ?string $redirectPath
    ): void {
        $user->update(['telegram_chat_id' => $chatId]);
        $this->enableTelegramNotifications($user);
        $this->acknowledgeCallbackQuery($callbackQueryId);
        $this->sendMessageWithWebAppButton(
            $chatId,
            $this->trans('account_created', ['app_name' => config('app.name', 'Meo Mai Moi')], $locale),
            $this->trans('open_app_button', [], $locale),
            $user,
            $redirectPath
        );
    }

    private function acknowledgeCallbackQuery(?string $callbackQueryId): void
    {
        if ($callbackQueryId !== null) {
            $this->answerCallbackQuery($callbackQueryId);
        }
    }

    private function telegramClient(): Telegram
    {
        $telegram = app(Telegram::class);
        $adminToken = Settings::get('telegram_bot_token');

        if ($adminToken) {
            $telegram->setToken($adminToken);
        }

        return $telegram;
    }

    private function buildWebAppUrl(?User $user, ?string $redirectPath): string
    {
        $frontendUrl = config('app.frontend_url', config('app.url', 'http://localhost:5173'));
        $webAppUrl = rtrim((string) $frontendUrl, '/').($redirectPath ?? '');
        $webAppUrl = preg_replace('/^http:\/\//', 'https://', $webAppUrl);

        if ($user === null) {
            return $webAppUrl;
        }

        $token = Str::random(64);
        Cache::put('telegram-miniapp-login:'.$token, $user->id, now()->addDays(30));

        return $webAppUrl.(str_contains($webAppUrl, '?') ? '&' : '?').'tg_token='.$token;
    }

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

    private function createAccountKeyboard(string $locale): array
    {
        return [
            'inline_keyboard' => [
                [
                    ['text' => $this->trans('create_account_button', [], $locale), 'callback_data' => 'create_account'],
                ],
            ],
        ];
    }
}
