<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Models\User;
use App\Services\Telegram\TelegramTokenRedactor;
use Illuminate\Support\Facades\Log;
use NotificationChannels\Telegram\Telegram;

class TelegramNotificationChannel implements NotificationChannelInterface
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function send(User $user, string $type, array $data): bool
    {
        try {
            $chatId = $user->telegram_chat_id;

            Log::debug('Telegram channel send requested', [
                'user_id' => $user->id,
                'type' => $type,
                'has_chat_id' => ! empty($chatId),
                'payload_keys' => array_keys($data),
            ]);

            if (! $chatId) {
                Log::debug('User has no Telegram chat linked, skipping', [
                    'user_id' => $user->id,
                    'type' => $type,
                ]);

                return false;
            }

            $userBotToken = $this->botToken();
            if ($userBotToken === null) {
                Log::error('Failed to send Telegram notification because bot token is not configured', [
                    'user_id' => $user->id,
                    'type' => $type,
                ]);

                return false;
            }

            $telegram = app(Telegram::class);
            $telegram->setToken($userBotToken);

            Log::debug('Telegram channel token source resolved', [
                'user_id' => $user->id,
                'type' => $type,
                'token_source' => 'telegram.user_bot.token',
            ]);

            $message = $this->buildMessage($type, $data);

            Log::debug('Sending Telegram message', [
                'user_id' => $user->id,
                'type' => $type,
                'chat_id' => $chatId,
                'message_length' => mb_strlen($message),
            ]);

            $response = $telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => $message,
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => true,
            ]);

            if ($response !== null && ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300)) {
                Log::error('Failed to send Telegram notification: unexpected response status', [
                    'user_id' => $user->id,
                    'type' => $type,
                    'status' => $response->getStatusCode(),
                ]);

                return false;
            }

            $this->logSuccess($user, $type, $response?->getStatusCode());

            return true;
        } catch (\Throwable $e) {
            $this->logError($user, $type, $e);

            return false;
        }
    }

    public function getChannelName(): string
    {
        return 'telegram';
    }

    /**
     * @param  array<string, mixed>  $data
     */
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

    private function botToken(): ?string
    {
        $token = config('telegram.user_bot.token') ?? config('services.telegram.token');

        return is_string($token) && $token !== '' ? $token : null;
    }

    private function logSuccess(User $user, string $type, ?int $statusCode): void
    {
        Log::info('Telegram notification sent', [
            'user_id' => $user->id,
            'type' => $type,
            'status' => $statusCode,
        ]);
    }

    private function logError(User $user, string $type, \Throwable $e): void
    {
        Log::error('Failed to send Telegram notification', [
            'user_id' => $user->id,
            'type' => $type,
            'error' => TelegramTokenRedactor::redact($e->getMessage()),
            'exception_class' => $e::class,
        ]);
    }
}
