<?php

declare(strict_types=1);

namespace App\Http\Controllers\Telegram;

use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Models\NotificationPreference;
use App\Services\TelegramMiniAppAuthService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LinkTelegramMiniAppController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, TelegramMiniAppAuthService $telegramAuthService)
    {
        $validated = $request->validate([
            'init_data' => ['required', 'string', 'max:8192'],
        ]);

        try {
            $telegramData = $telegramAuthService->verify($validated['init_data']);
        } catch (\RuntimeException $e) {
            return $this->sendError($e->getMessage(), 500);
        } catch (\InvalidArgumentException $e) {
            return $this->sendError($e->getMessage(), 422);
        }

        $user = Auth::user();

        $user->update([
            'telegram_chat_id' => (string) $telegramData['telegram_chat_id'],
            'telegram_user_id' => (int) $telegramData['telegram_user_id'],
            'telegram_username' => $telegramData['telegram_username'],
            'telegram_first_name' => $telegramData['telegram_first_name'],
            'telegram_last_name' => $telegramData['telegram_last_name'],
            'telegram_photo_url' => $telegramData['telegram_photo_url'],
            'telegram_last_authenticated_at' => now(),
        ]);

        $this->enableTelegramNotifications($user);

        return $this->sendSuccess([
            'is_connected' => true,
            'telegram_chat_id' => (string) $user->telegram_chat_id,
        ]);
    }

    private function enableTelegramNotifications($user): void
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
}
