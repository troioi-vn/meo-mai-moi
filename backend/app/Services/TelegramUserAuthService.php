<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Settings;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TelegramUserAuthService
{
    public function __construct(
        private InvitationService $invitationService,
    ) {}

    /**
     * Find or create a user by Telegram user ID, handle invite-only mode, and log in.
     *
     * @param  array{
     *   telegram_user_id: int,
    *   telegram_chat_id?: ?string,
     *   telegram_username: ?string,
     *   telegram_first_name: ?string,
     *   telegram_last_name: ?string,
     *   telegram_photo_url: ?string,
     *   auth_date: int,
     *   query_id?: ?string,
     * }  $telegramData
     * @return array{user: User, created: bool}
     */
    public function findOrCreateAndLogin(array $telegramData, ?string $invitationCode, Request $request): array
    {
        $chatId = isset($telegramData['telegram_chat_id']) && is_string($telegramData['telegram_chat_id'])
            ? trim($telegramData['telegram_chat_id'])
            : null;

        $userQuery = User::query()->where('telegram_user_id', $telegramData['telegram_user_id']);
        if ($chatId !== null && $chatId !== '') {
            $userQuery->orWhere('telegram_chat_id', $chatId);
        }

        $user = $userQuery->first();
        $created = false;

        if (! $user) {
            $inviteOnlyEnabled = filter_var(Settings::get('invite_only_enabled', false), FILTER_VALIDATE_BOOLEAN);
            $isValidInvitation = is_string($invitationCode)
                && $invitationCode !== ''
                && $this->invitationService->validateInvitationCode($invitationCode) !== null;

            if ($inviteOnlyEnabled && ! $isValidInvitation) {
                return ['user' => null, 'created' => false, 'invite_only_blocked' => true];
            }

            $user = User::create([
                'name' => $this->buildDisplayName($telegramData),
                'email' => $this->buildTelegramEmail($telegramData['telegram_user_id']),
                'password' => null,
                'telegram_user_id' => $telegramData['telegram_user_id'],
                'telegram_username' => $telegramData['telegram_username'],
                'telegram_first_name' => $telegramData['telegram_first_name'],
                'telegram_last_name' => $telegramData['telegram_last_name'],
                'telegram_photo_url' => $telegramData['telegram_photo_url'],
                'telegram_last_authenticated_at' => now(),
            ]);
            $user->forceFill(['email_verified_at' => now()])->save();
            $created = true;

            if ($isValidInvitation) {
                $this->invitationService->acceptInvitation($invitationCode, $user);
            }
        } else {
            $user->update([
                'telegram_user_id' => $telegramData['telegram_user_id'],
                'telegram_chat_id' => ($chatId !== null && $chatId !== '') ? $chatId : $user->telegram_chat_id,
                'telegram_username' => $telegramData['telegram_username'],
                'telegram_first_name' => $telegramData['telegram_first_name'],
                'telegram_last_name' => $telegramData['telegram_last_name'],
                'telegram_photo_url' => $telegramData['telegram_photo_url'],
                'telegram_last_authenticated_at' => now(),
            ]);
        }

        if ($request->hasSession()) {
            Auth::login($user, true);
            $request->session()->regenerate();
        }

        return ['user' => $user, 'created' => $created, 'invite_only_blocked' => false];
    }

    /**
     * @param  array{telegram_first_name: ?string, telegram_last_name: ?string, telegram_username: ?string, telegram_user_id: int}  $telegramData
     */
    private function buildDisplayName(array $telegramData): string
    {
        $parts = array_values(array_filter([
            $telegramData['telegram_first_name'],
            $telegramData['telegram_last_name'],
        ]));

        if ($parts !== []) {
            return implode(' ', $parts);
        }

        if (is_string($telegramData['telegram_username']) && $telegramData['telegram_username'] !== '') {
            return '@'.$telegramData['telegram_username'];
        }

        return 'Telegram User '.$telegramData['telegram_user_id'];
    }

    private function buildTelegramEmail(int $telegramUserId): string
    {
        return sprintf('telegram_%d@telegram.meo-mai-moi.local', $telegramUserId);
    }
}
