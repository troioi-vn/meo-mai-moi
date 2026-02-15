<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Models\Settings;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use NotificationChannels\Telegram\Telegram;

class TelegramNotificationChannel implements NotificationChannelInterface
{
    public function send(User $user, string $type, array $data): bool
    {
        try {
            $chatId = $user->telegram_chat_id;

            if (! $chatId) {
                Log::debug('User has no Telegram chat linked, skipping', [
                    'user_id' => $user->id,
                    'type' => $type,
                ]);

                return false;
            }

            $telegram = app(Telegram::class);

            // Use admin-configured token if available, fallback to env config
            $adminToken = Settings::get('telegram_bot_token');
            if ($adminToken) {
                $telegram->setToken($adminToken);
            }

            $message = $this->buildMessage($type, $data);

            $telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => $message,
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => true,
            ]);

            $this->logSuccess($user, $type);

            return true;
        } catch (\Exception $e) {
            $this->logError($user, $type, $e);

            return false;
        }
    }

    public function getChannelName(): string
    {
        return 'telegram';
    }

    private function buildMessage(string $type, array $data): string
    {
        $title = $data['title'] ?? $data['message'] ?? 'Notification';
        $body = $data['body'] ?? '';
        $link = $data['link'] ?? null;

        $text = "<b>{$this->escape($title)}</b>";

        if ($body) {
            $text .= "\n\n{$this->escape($body)}";
        }

        if ($link) {
            $fullLink = str_starts_with($link, 'http') ? $link : config('app.url').$link;
            $text .= "\n\n<a href=\"{$fullLink}\">Open in Meo Mai Moi</a>";
        }

        return $text;
    }

    private function escape(string $text): string
    {
        return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private function logSuccess(User $user, string $type): void
    {
        Log::info('Telegram notification sent', [
            'user_id' => $user->id,
            'type' => $type,
        ]);
    }

    private function logError(User $user, string $type, \Exception $e): void
    {
        Log::error('Failed to send Telegram notification', [
            'user_id' => $user->id,
            'type' => $type,
            'error' => $e->getMessage(),
        ]);
    }
}
