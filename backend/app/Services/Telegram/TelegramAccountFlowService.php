<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Models\Settings;
use App\Models\User;
use App\Services\TelegramUserAuthService;
use Illuminate\Http\Request;

class TelegramAccountFlowService
{
    public function __construct(
        private readonly TelegramLoginHandshakeService $handshakeService,
        private readonly TelegramLoginRedirectService $redirectService,
        private readonly TelegramLocaleService $localeService,
        private readonly TelegramIdentityService $identityService,
        private readonly TelegramBotApiService $botApi,
        private readonly TelegramUserAuthService $userAuthService,
    ) {}

    /** @param array<string, mixed> $telegramFrom */
    public function create(
        string $chatId,
        ?string $callbackQueryId,
        array $telegramFrom,
        ?string $redirectPath = null,
    ): void {
        $handshakeNonce = $this->handshakeService->nonceForChat($chatId);
        $handshakeContext = $handshakeNonce !== null ? $this->handshakeService->context($handshakeNonce) : null;
        $locale = $this->localeService->resolve(
            $chatId,
            null,
            $handshakeContext['locale'] ?? null,
            $telegramFrom['language_code'] ?? null,
        );
        $redirectPath ??= $this->redirectService->consume($chatId);
        $redirectPath ??= $handshakeContext['redirect_path'] ?? null;

        if ($this->isInviteOnlyEnabled()) {
            $this->sendInviteOnlyMessage($chatId, $callbackQueryId, $locale);

            return;
        }

        $telegramData = $this->identityService->dataFromMessageUser($telegramFrom);

        $existing = User::where('telegram_user_id', $telegramData['telegram_user_id'])->first();
        if ($existing) {
            $this->completeExistingAccountFlow($existing, $chatId, $callbackQueryId, $locale, $redirectPath, $handshakeNonce);

            return;
        }

        $result = $this->userAuthService->findOrCreateAndLogin($telegramData, null, new Request, $locale);

        if ($result['invite_only_blocked']) {
            $this->sendInviteOnlyMessage($chatId, $callbackQueryId, $locale);

            return;
        }

        $this->completeNewAccountFlow($result['user'], $chatId, $callbackQueryId, $locale, $redirectPath, $handshakeNonce);
    }

    public function approveHandshakeAndReply(
        string $nonce,
        string $chatId,
        User $user,
        string $locale,
        ?string $redirectPath,
    ): void {
        if (! $this->handshakeService->approveForTelegramUser($nonce, (int) $user->telegram_user_id, $user)) {
            $this->botApi->sendMessage($chatId, $this->localeService->trans('invalid_login_handshake', [], $locale));

            return;
        }

        $this->sendApprovedHandshakeReply($chatId, $user, $locale, $redirectPath);
    }

    public function sendApprovedHandshakeReply(string $chatId, User $user, string $locale, ?string $redirectPath): void
    {
        $returnToken = $this->handshakeService->issueReturnToken($user, $redirectPath);
        $returnUrl = rtrim((string) config('app.url', 'https://meomaimoi.com'), '/')
            .'/auth/telegram/return?'.http_build_query(['token' => $returnToken['token']]);

        $this->botApi->sendMessageWithUrlButton(
            $chatId,
            $this->localeService->trans('browser_sign_in_approved', [
                'name' => htmlspecialchars($user->name, ENT_QUOTES, 'UTF-8'),
            ], $locale),
            $this->localeService->trans('open_browser_button', [], $locale),
            $returnUrl,
        );
        $this->handshakeService->forgetChat($chatId);
    }

    private function completeExistingAccountFlow(
        User $user,
        string $chatId,
        ?string $callbackQueryId,
        string $locale,
        ?string $redirectPath,
        ?string $handshakeNonce = null,
    ): void {
        $this->identityService->unlinkFromOtherUsers($user, $chatId, $user->telegram_user_id);
        $user->update(['telegram_chat_id' => $chatId]);
        $this->identityService->enableNotifications($user);
        $this->acknowledgeCallbackQuery($callbackQueryId);
        if ($handshakeNonce !== null) {
            $this->approveHandshakeAndReply($handshakeNonce, $chatId, $user, $locale, $redirectPath);

            return;
        }

        $this->botApi->sendMessageWithWebAppButton(
            $chatId,
            $this->localeService->trans('account_found', [], $locale),
            $this->localeService->trans('open_telegram_button', [], $locale),
            $redirectPath,
        );
    }

    private function completeNewAccountFlow(
        User $user,
        string $chatId,
        ?string $callbackQueryId,
        string $locale,
        ?string $redirectPath,
        ?string $handshakeNonce = null,
    ): void {
        $this->identityService->unlinkFromOtherUsers($user, $chatId, $user->telegram_user_id);
        $user->update(['telegram_chat_id' => $chatId]);
        $this->identityService->enableNotifications($user);
        $this->acknowledgeCallbackQuery($callbackQueryId);
        if ($handshakeNonce !== null) {
            $this->approveHandshakeAndReply($handshakeNonce, $chatId, $user, $locale, $redirectPath);

            return;
        }

        $this->botApi->sendMessageWithWebAppButton(
            $chatId,
            $this->localeService->trans('account_created', ['app_name' => config('app.name', 'Meo Mai Moi')], $locale),
            $this->localeService->trans('open_telegram_button', [], $locale),
            $redirectPath,
        );
    }

    private function isInviteOnlyEnabled(): bool
    {
        return filter_var(Settings::get('invite_only_enabled', false), FILTER_VALIDATE_BOOLEAN);
    }

    private function sendInviteOnlyMessage(string $chatId, ?string $callbackQueryId, string $locale): void
    {
        if ($callbackQueryId !== null) {
            $this->botApi->answerCallbackQuery(
                $callbackQueryId,
                $this->localeService->trans('invite_only_short', [], $locale),
            );
        }

        $this->botApi->sendMessage($chatId, $this->localeService->trans('invite_only', [], $locale));
    }

    private function acknowledgeCallbackQuery(?string $callbackQueryId): void
    {
        if ($callbackQueryId !== null) {
            $this->botApi->answerCallbackQuery($callbackQueryId);
        }
    }
}
