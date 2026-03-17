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
     * @return array{user: User, created: bool, invite_only_blocked: false}|array{user: null, created: false, invite_only_blocked: true}
     */
    public function findOrCreateAndLogin(array $telegramData, ?string $invitationCode, Request $request, ?string $locale = null): array
    {
        $chatId = $this->extractChatId($telegramData);
        $user = $this->findExistingUser((int) $telegramData['telegram_user_id'], $chatId);

        if ($user === null) {
            if (! $this->canRegisterWithInvitation($invitationCode)) {
                return ['user' => null, 'created' => false, 'invite_only_blocked' => true];
            }

            $user = $this->createTelegramUser($telegramData, $locale);
            $this->acceptInvitationIfPresent($invitationCode, $user);

            $created = true;
        } else {
            $this->refreshTelegramUser($user, $telegramData, $chatId);
            $created = false;
        }

        $this->logIntoSession($request, $user);

        return ['user' => $user, 'created' => $created, 'invite_only_blocked' => false];
    }

    /**
     * @param  array{telegram_chat_id?: ?string}  $telegramData
     */
    private function extractChatId(array $telegramData): ?string
    {
        if (! isset($telegramData['telegram_chat_id']) || ! is_string($telegramData['telegram_chat_id'])) {
            return null;
        }

        $chatId = trim($telegramData['telegram_chat_id']);

        return $chatId !== '' ? $chatId : null;
    }

    private function findExistingUser(int $telegramUserId, ?string $chatId): ?User
    {
        $user = User::where('telegram_user_id', $telegramUserId)->first();

        if ($user !== null || $chatId === null) {
            return $user;
        }

        return User::where('telegram_chat_id', $chatId)
            ->whereNull('telegram_user_id')
            ->first();
    }

    private function canRegisterWithInvitation(?string $invitationCode): bool
    {
        $inviteOnlyEnabled = filter_var(Settings::get('invite_only_enabled', false), FILTER_VALIDATE_BOOLEAN);

        if (! $inviteOnlyEnabled) {
            return true;
        }

        return $this->isValidInvitationCode($invitationCode);
    }

    private function isValidInvitationCode(?string $invitationCode): bool
    {
        return is_string($invitationCode)
            && $invitationCode !== ''
            && $this->invitationService->validateInvitationCode($invitationCode) !== null;
    }

    /**
     * @param  array{
     *   telegram_user_id: int,
     *   telegram_username: ?string,
     *   telegram_first_name: ?string,
     *   telegram_last_name: ?string,
     *   telegram_photo_url: ?string
     * }  $telegramData
     */
    private function createTelegramUser(array $telegramData, ?string $locale): User
    {
        $user = User::create($this->buildUserData($telegramData, $locale));
        $user->forceFill(['email_verified_at' => now()])->save();

        return $user;
    }

    /**
     * @param  array{
     *   telegram_user_id: int,
     *   telegram_username: ?string,
     *   telegram_first_name: ?string,
     *   telegram_last_name: ?string,
     *   telegram_photo_url: ?string
     * }  $telegramData
     */
    private function buildUserData(array $telegramData, ?string $locale): array
    {
        $userData = [
            'name' => $this->buildDisplayName($telegramData),
            'email' => $this->buildTelegramEmail($telegramData['telegram_user_id']),
            'password' => null,
            'telegram_user_id' => $telegramData['telegram_user_id'],
            'telegram_username' => $telegramData['telegram_username'],
            'telegram_first_name' => $telegramData['telegram_first_name'],
            'telegram_last_name' => $telegramData['telegram_last_name'],
            'telegram_photo_url' => $telegramData['telegram_photo_url'],
            'telegram_last_authenticated_at' => now(),
        ];

        if ($locale !== null) {
            $userData['locale'] = $locale;
        }

        return $userData;
    }

    /**
     * @param  array{
     *   telegram_user_id: int,
     *   telegram_username: ?string,
     *   telegram_first_name: ?string,
     *   telegram_last_name: ?string,
     *   telegram_photo_url: ?string
     * }  $telegramData
     */
    private function refreshTelegramUser(User $user, array $telegramData, ?string $chatId): void
    {
        $user->update([
            'telegram_user_id' => $telegramData['telegram_user_id'],
            'telegram_chat_id' => $chatId ?? $user->telegram_chat_id,
            'telegram_username' => $telegramData['telegram_username'],
            'telegram_first_name' => $telegramData['telegram_first_name'],
            'telegram_last_name' => $telegramData['telegram_last_name'],
            'telegram_photo_url' => $telegramData['telegram_photo_url'],
            'telegram_last_authenticated_at' => now(),
        ]);
    }

    private function acceptInvitationIfPresent(?string $invitationCode, User $user): void
    {
        if ($this->isValidInvitationCode($invitationCode)) {
            $this->invitationService->acceptInvitation($invitationCode, $user);
        }
    }

    private function logIntoSession(Request $request, User $user): void
    {
        if (! $request->hasSession()) {
            return;
        }

        Auth::login($user, true);
        $request->session()->regenerate();
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
