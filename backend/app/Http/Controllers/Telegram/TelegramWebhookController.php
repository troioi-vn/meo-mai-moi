<?php

declare(strict_types=1);

namespace App\Http\Controllers\Telegram;

use App\Http\Controllers\Controller;
use App\Models\Settings;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use NotificationChannels\Telegram\Telegram;

class TelegramWebhookController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $update = $request->all();

        Log::debug('Telegram webhook received', ['update' => $update]);

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
            $this->handleStartCommand($text, $chatId);
        }

        return response()->json(['ok' => true]);
    }

    private function handleStartCommand(string $text, string $chatId): void
    {
        $parts = explode(' ', $text, 2);
        $token = $parts[1] ?? null;

        if (! $token) {
            $this->sendMessage($chatId, $this->getNoTokenMessage());

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

        Log::info('Telegram linked to user', [
            'user_id' => $user->id,
            'chat_id' => $chatId,
        ]);

        $appName = config('app.name', 'Meo Mai Moi');
        $this->sendMessage($chatId, "Connected! You will now receive notifications from {$appName} here.");
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

    private function getNoTokenMessage(): string
    {
        $appUrl = config('app.url', 'https://meomaimoi.com');

        return "Please open Settings \u{2192} Notifications and click \"Connect Telegram\" in your Meo Mai Moi account to link this bot.\n\n"
            ."<a href=\"{$appUrl}/settings/notifications\">Open Notification Settings</a>";
    }

    private function getInvalidTokenMessage(): string
    {
        $appUrl = config('app.url', 'https://meomaimoi.com');

        return "This link has expired or is invalid. Please go to Settings \u{2192} Notifications and click \"Connect Telegram\" again to get a new link.\n\n"
            ."<a href=\"{$appUrl}/settings/notifications\">Open Notification Settings</a>";
    }
}
