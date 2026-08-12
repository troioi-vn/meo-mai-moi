<?php

declare(strict_types=1);

namespace App\Http\Controllers\Telegram;

use App\Http\Controllers\Controller;
use App\Services\Telegram\TelegramCallbackQueryService;
use App\Services\Telegram\TelegramStartCommandService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller
{
    public function __construct(
        private readonly TelegramStartCommandService $startCommandService,
        private readonly TelegramCallbackQueryService $callbackQueryService,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        if ($this->hasInvalidWebhookSecret($request)) {
            Log::warning('Rejected Telegram webhook with invalid secret token.', [
                'has_header' => $request->hasHeader('X-Telegram-Bot-Api-Secret-Token'),
            ]);

            return response()->json(['ok' => false], 403);
        }

        $update = $request->all();

        Log::debug('Telegram webhook received', ['update' => $update]);

        $callbackQuery = $update['callback_query'] ?? null;
        if (is_array($callbackQuery)) {
            $this->callbackQueryService->handle($callbackQuery);

            return $this->okResponse();
        }

        $message = $update['message'] ?? null;
        if (! is_array($message)) {
            return $this->okResponse();
        }

        $chatId = $message['chat']['id'] ?? null;
        if ($chatId === null) {
            return $this->okResponse();
        }

        $text = is_string($message['text'] ?? null) ? $message['text'] : '';
        if (str_starts_with($text, '/start')) {
            $this->startCommandService->handle($text, (string) $chatId, $message);
        }

        return $this->okResponse();
    }

    private function hasInvalidWebhookSecret(Request $request): bool
    {
        $expectedSecret = (string) config('telegram.user_bot.webhook_secret_token', '');

        if ($expectedSecret === '') {
            return false;
        }

        $providedSecret = (string) $request->header('X-Telegram-Bot-Api-Secret-Token', '');

        return $providedSecret === '' || ! hash_equals($expectedSecret, $providedSecret);
    }

    private function okResponse(): JsonResponse
    {
        return response()->json(['ok' => true]);
    }
}
