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
        $token = $parts[1] ?? null;

        if (! $token) {
            $this->handleStartWithoutToken($chatId, $message, $userAuthService);

            return;
        }

        $user = User::where('telegram_link_token', $token)
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
        $this->sendMessage($chatId, "Telegram account linked! You can now use Telegram login via this bot and receive notifications from {$appName} here.");
    }

    private function handleStartWithoutToken(string $chatId, array $message, TelegramUserAuthService $userAuthService): void
    {
        $telegramFrom = $message['from'] ?? null;
        if (! $telegramFrom || ! isset($telegramFrom['id'])) {
            $this->sendMessage($chatId, $this->getNoTokenMessage());

            return;
        }

        $telegramUserId = (int) $telegramFrom['id'];

        // Check if user with this telegram_user_id already exists → auto-link
        $existingUser = User::where('telegram_user_id', $telegramUserId)->first();

        if ($existingUser) {
            // Auto-link chat_id and enable notifications
            $existingUser->update(['telegram_chat_id' => $chatId]);
            $this->enableTelegramNotifications($existingUser);

            $appName = config('app.name', 'Meo Mai Moi');
            $this->sendMessage($chatId, "Welcome back, {$existingUser->name}! Your Telegram is now linked for notifications from {$appName}.");

            return;
        }

        // No existing user — show inline keyboard with options
        $this->sendMessageWithInlineKeyboard($chatId);
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

        match ($callbackData) {
            'create_account' => $this->handleCreateAccount($chatId, $callbackQueryId, $telegramFrom, $userAuthService),
            'link_account' => $this->handleLinkAccount($chatId, $callbackQueryId),
            default => $this->answerCallbackQuery($callbackQueryId),
        };
    }

    private function handleCreateAccount(string $chatId, string $callbackQueryId, array $telegramFrom, TelegramUserAuthService $userAuthService): void
    {
        $inviteOnlyEnabled = filter_var(Settings::get('invite_only_enabled', false), FILTER_VALIDATE_BOOLEAN);

        if ($inviteOnlyEnabled) {
            $appUrl = config('app.url', 'https://meomaimoi.com');
            $this->answerCallbackQuery($callbackQueryId, 'Registration is invite-only.');
            $this->sendMessage($chatId, "Registration is currently invite-only. If you already have an account, you can link it from your account settings.\n\n<a href=\"{$appUrl}/settings/account\">Open Account Settings</a>");

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
            $this->answerCallbackQuery($callbackQueryId, 'Account found!');
            $this->sendMessage($chatId, "You already have an account. Your Telegram is now linked for notifications!");

            return;
        }

        // Create new user via the existing service (passing a fake request without session)
        $result = $userAuthService->findOrCreateAndLogin($telegramData, null, new \Illuminate\Http\Request());

        if ($result['invite_only_blocked']) {
            $this->answerCallbackQuery($callbackQueryId, 'Registration is invite-only.');
            $this->sendMessage($chatId, 'Registration is currently invite-only.');

            return;
        }

        $user = $result['user'];
        $user->update(['telegram_chat_id' => $chatId]);
        $this->enableTelegramNotifications($user);

        $appName = config('app.name', 'Meo Mai Moi');
        $this->answerCallbackQuery($callbackQueryId, 'Account created!');
        $this->sendMessage($chatId, "Welcome to {$appName}! Your account has been created and Telegram notifications are enabled.");
    }

    private function handleLinkAccount(string $chatId, string $callbackQueryId): void
    {
        $appUrl = config('app.url', 'https://meomaimoi.com');
        $this->answerCallbackQuery($callbackQueryId);
        $this->sendMessage($chatId, "To link your existing account, go to Settings \u{2192} Account in your Meo Mai Moi profile and click \"Connect Telegram\".\n\n<a href=\"{$appUrl}/settings/account\">Open Account Settings</a>");
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

    private function sendMessageWithInlineKeyboard(string $chatId): void
    {
        try {
            $telegram = app(Telegram::class);

            $adminToken = Settings::get('telegram_bot_token');
            if ($adminToken) {
                $telegram->setToken($adminToken);
            }

            $appName = config('app.name', 'Meo Mai Moi');
            $keyboard = [
                'inline_keyboard' => [
                    [
                        ['text' => 'Create new account', 'callback_data' => 'create_account'],
                        ['text' => 'Link existing account', 'callback_data' => 'link_account'],
                    ],
                ],
            ];

            $telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => "Welcome to {$appName}! What would you like to do?",
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode($keyboard),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send Telegram inline keyboard', [
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
