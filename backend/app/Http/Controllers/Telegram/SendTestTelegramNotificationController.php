<?php

declare(strict_types=1);

namespace App\Http\Controllers\Telegram;

use App\Http\Controllers\Controller;
use App\Services\Notifications\TelegramNotificationChannel;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/telegram/test-notification',
    tags: ['Telegram'],
    security: [['sanctum' => []]],
    responses: [
        new OA\Response(
            response: 200,
            description: 'OK',
            content: new OA\JsonContent(ref: '#/components/schemas/ApiSuccessMessageResponse')
        ),
        new OA\Response(response: 422, description: 'Unprocessable Entity'),
    ]
)]
class SendTestTelegramNotificationController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(TelegramNotificationChannel $telegramChannel)
    {
        $user = Auth::user();

        Log::debug('Manual Telegram test notification requested', [
            'user_id' => $user->id,
            'has_telegram_chat_id' => ! empty($user->telegram_chat_id),
        ]);

        $sent = $telegramChannel->send($user, 'telegram_test_notification', [
            'title' => 'Telegram test notification',
            'body' => sprintf('Test sent at %s for user #%d.', now()->toIso8601String(), $user->id),
            'link' => '/settings/notifications',
        ]);

        if (! $sent) {
            return $this->sendError('Failed to send Telegram test notification. Check server logs for details.', 422);
        }

        return $this->sendSuccessWithMeta(null, 'Telegram test notification sent successfully.');
    }
}
