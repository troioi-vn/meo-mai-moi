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
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use NotificationChannels\Telegram\Telegram;

class TelegramWebhookController extends Controller
{
    public function __invoke(Request $request, TelegramUserAuthService $userAuthService): JsonResponse
    {
        $update = $request->all();

        Log::debug('Telegram webhook received', ['update' => $update]);

        // Handle callback queries (inline keyboard button presses)
        $callbackQuery = $update['callback_query'] ?? null;
        if ($callbackQuery) {
            $this->handleCallbackQuery($callbackQuery, $userAuthService);

            return response()->json(['ok' => true]);
        }

        $message = $update['message'] ?? null;
        if (! $message) {
            return response()->json(['ok' => true]);
        }

        $text = $message['text'] ?? '';
        $chatId = (string) ($message['chat']['id'] ?? '');

        if (! $chatId) {
            return response()->json(['ok' => true]);
        }

        if (str_starts_with($text, '/start')) {
            $this->handleStartCommand($text, $chatId, $message, $userAuthService);
        }

        return response()->json(['ok' => true]);
    }

    private function handleStartCommand(string $text, string $chatId, array $message, TelegramUserAuthService $userAuthService): void
    {
        $parts = explode(' ', $text, 2);
        $param = $parts[1] ?? null;

        // /start create_account — fallback flow when callback_query updates are unavailable
        if ($param === 'create_account') {
            $this->handleCreateAccountFromStart($chatId, $message, $userAuthService);

            return;
        }

        // /start login — same flow as /start (no token), user came from web
        if (! $param || $param === 'login') {
            $this->handleStartWithoutToken($chatId, $message, $userAuthService);

            return;
        }

        // /start <token> — linking from Settings → Account
        $user = User::where('telegram_link_token', $param)
            ->where('telegram_link_token_expires_at', '>', now())
            ->first();

        if (! $user) {
            $this->sendMessage($chatId, $this->getInvalidTokenMessage());

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

        $appName = config('app.name', 'Meo Mai Moi');
        $this->sendMessageWithWebAppButton(
            $chatId,
            "Telegram account linked! You can now receive notifications from {$appName} here and log in via this bot.",
            'Open App'
        );
    }

    private function handleStartWithoutToken(string $chatId, array $message, TelegramUserAuthService $userAuthService): void
    {
        $telegramFrom = $message['from'] ?? null;
        if (! $telegramFrom || ! isset($telegramFrom['id'])) {
            $this->sendMessage($chatId, $this->getNoTokenMessage());

            return;
        }

        $telegramUserId = (int) $telegramFrom['id'];

        // Check if user with this telegram_user_id or telegram_chat_id already exists
        $existingUser = User::where('telegram_user_id', $telegramUserId)
            ->orWhere('telegram_chat_id', $chatId)
            ->first();

        if ($existingUser) {
            // Auto-link chat_id and enable notifications
            $existingUser->update([
                'telegram_chat_id' => $chatId,
                'telegram_user_id' => $telegramUserId,
            ]);
            $this->enableTelegramNotifications($existingUser);

            $appName = config('app.name', 'Meo Mai Moi');
            $this->sendMessageWithWebAppButton(
                $chatId,
                "Your Telegram account is already linked to {$appName}! Click the button below to open the app.",
                'Open App'
            );

            return;
        }

        // No existing user — show single "Create new account" button
        $this->sendCreateAccountKeyboard($chatId);
    }

    private function handleCreateAccountFromStart(string $chatId, array $message, TelegramUserAuthService $userAuthService): void
    {
        $telegramFrom = $message['from'] ?? null;
        if (! $telegramFrom || ! isset($telegramFrom['id'])) {
            $this->sendMessage($chatId, 'Unable to identify your Telegram account. Please try again.');

            return;
        }

        $this->handleCreateAccount($chatId, null, $telegramFrom, $userAuthService);
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

        if ($callbackData === 'create_account') {
            $this->handleCreateAccount($chatId, $callbackQueryId, $telegramFrom, $userAuthService);
        } else {
            $this->answerCallbackQuery($callbackQueryId);
        }
    }

    private function handleCreateAccount(string $chatId, ?string $callbackQueryId, array $telegramFrom, TelegramUserAuthService $userAuthService): void
    {
        $inviteOnlyEnabled = filter_var(Settings::get('invite_only_enabled', false), FILTER_VALIDATE_BOOLEAN);

        if ($inviteOnlyEnabled) {
            if ($callbackQueryId !== null) {
                $this->answerCallbackQuery($callbackQueryId, 'Registration is invite-only.');
            }
            $this->sendMessage($chatId, "Registration is currently invite-only. If you already have an account, you can link it from Settings \u{2192} Account in the app.");

            return;
        }

        $telegramData = [
            'telegram_user_id' => (int) $telegramFrom['id'],
            'telegram_username' => $this->nullableString($telegramFrom['username'] ?? null),
            'telegram_first_name' => $this->nullableString($telegramFrom['first_name'] ?? null),
            'telegram_last_name' => $this->nullableString($telegramFrom['last_name'] ?? null),
            'telegram_photo_url' => null,
            'auth_date' => time(),
        ];

        // Check if user already exists (race condition guard)
        $existing = User::where('telegram_user_id', $telegramData['telegram_user_id'])->first();
        if ($existing) {
            $existing->update(['telegram_chat_id' => $chatId]);
            $this->enableTelegramNotifications($existing);
            if ($callbackQueryId !== null) {
                $this->answerCallbackQuery($callbackQueryId, 'Account found!');
            }
            $this->sendMessageWithWebAppButton(
                $chatId,
                "You already have an account! Your Telegram is now linked.",
                'Open App'
            );

            return;
        }

        // Create new user via the existing service (passing a fake request without session)
        $result = $userAuthService->findOrCreateAndLogin($telegramData, null, new \Illuminate\Http\Request());

        if ($result['invite_only_blocked']) {
            if ($callbackQueryId !== null) {
                $this->answerCallbackQuery($callbackQueryId, 'Registration is invite-only.');
            }
            $this->sendMessage($chatId, 'Registration is currently invite-only.');

            return;
        }

        $user = $result['user'];
        $user->update(['telegram_chat_id' => $chatId]);
        $this->enableTelegramNotifications($user);

        $appName = config('app.name', 'Meo Mai Moi');
        if ($callbackQueryId !== null) {
            $this->answerCallbackQuery($callbackQueryId, 'Account created!');
        }
        $this->sendMessageWithWebAppButton(
            $chatId,
            "Your account has been created and linked to Telegram! Click the button below to open {$appName}.",
            'Open App'
        );
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
            $telegram = app(Telegram::class);

            $adminToken = Settings::get('telegram_bot_token');
            if ($adminToken) {
                $telegram->setToken($adminToken);
            }
            $telegram->sendMessage([
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

    private function sendMessageWithWebAppButton(string $chatId, string $text, string $buttonText): void
    {
        try {
            $telegram = app(Telegram::class);

            $adminToken = Settings::get('telegram_bot_token');
            if ($adminToken) {
                $telegram->setToken($adminToken);
            }

            $frontendUrl = config('app.frontend_url', config('app.url', 'http://localhost:5173'));

            $keyboard = [
                'inline_keyboard' => [
                    [
                        ['text' => $buttonText, 'web_app' => ['url' => $frontendUrl]],
                    ],
                ],
            ];

            $telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode($keyboard),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send Telegram message with web app button', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function sendCreateAccountKeyboard(string $chatId): void
    {
        try {
            $telegram = app(Telegram::class);

            $adminToken = Settings::get('telegram_bot_token');
            if ($adminToken) {
                $telegram->setToken($adminToken);
            }

            $appName = config('app.name', 'Meo Mai Moi');
            $botUsername = Settings::get('telegram_bot_username');
            $createAccountUrl = is_string($botUsername) && trim($botUsername) !== ''
                ? 'https://t.me/'.trim($botUsername).'?start=create_account'
                : null;

            $keyboard = [
                'inline_keyboard' => [
                    [
                        $createAccountUrl
                            ? ['text' => 'Create new account', 'url' => $createAccountUrl]
                            : ['text' => 'Create new account', 'callback_data' => 'create_account'],
                    ],
                ],
            ];

            $telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => "Welcome to {$appName}! Click the button below to create your account.",
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode($keyboard),
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

    private function getNoTokenMessage(): string
    {
        $appUrl = config('app.url', 'https://meomaimoi.com');

        return "Please open Settings \u{2192} Account and click \"Connect Telegram\" in your Meo Mai Moi account to link this bot.\n\n"
            ."<a href=\"{$appUrl}/settings/account\">Open Account Settings</a>";
    }

    private function getInvalidTokenMessage(): string
    {
        $appUrl = config('app.url', 'https://meomaimoi.com');

        return "This link has expired or is invalid. Please go to Settings \u{2192} Account and click \"Connect Telegram\" again to get a new link.\n\n"
            ."<a href=\"{$appUrl}/settings/account\">Open Account Settings</a>";
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
