<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Models\User;
use Illuminate\Support\Facades\Log;

class TelegramStartCommandService
{
    public function __construct(
        private readonly TelegramLoginHandshakeService $handshakeService,
        private readonly TelegramLoginRedirectService $redirectService,
        private readonly TelegramLocaleService $localeService,
        private readonly TelegramIdentityService $identityService,
        private readonly TelegramAccountFlowService $accountFlowService,
        private readonly TelegramBotApiService $botApi,
    ) {}

    /** @param array<string, mixed> $message */
    public function handle(string $text, string $chatId, array $message): void
    {
        $parts = explode(' ', $text, 2);
        $param = $parts[1] ?? null;

        if (is_string($param) && preg_match('/^hs_([A-Za-z0-9]{32})$/', $param, $matches) === 1) {
            $this->handleHandshakeStart($matches[1], $chatId, $message);

            return;
        }

        $redirectPath = $this->redirectService->resolve($param, $chatId);

        if ($param === 'create_account') {
            $this->handleCreateAccountFromStart($chatId, $message, $redirectPath);

            return;
        }

        if (! $param || $param === 'login' || str_starts_with($param, 'login_')) {
            $this->handleStartWithoutToken($chatId, $message, $redirectPath);

            return;
        }

        $user = User::where('telegram_link_token', $param)
            ->where('telegram_link_token_expires_at', '>', now())
            ->first();

        if (! $user) {
            $locale = $this->localeService->resolve($chatId);
            $this->botApi->sendMessage($chatId, $this->localeService->trans('invalid_token', [
                'url' => config('app.url', 'https://meomaimoi.com'),
            ], $locale));

            return;
        }

        $existingUser = User::where('telegram_chat_id', $chatId)
            ->where('id', '!=', $user->id)
            ->first();

        if ($existingUser) {
            $existingUser->update(['telegram_chat_id' => null]);
        }

        $telegramFrom = $message['from'] ?? null;
        $telegramUserId = is_array($telegramFrom) && isset($telegramFrom['id'])
            ? (int) $telegramFrom['id']
            : null;

        $this->identityService->unlinkFromOtherUsers($user, $chatId, $telegramUserId);

        $linkUpdates = [
            'telegram_chat_id' => $chatId,
            'telegram_link_token' => null,
            'telegram_link_token_expires_at' => null,
        ];

        if ($telegramUserId !== null && is_array($telegramFrom)) {
            $linkUpdates['telegram_user_id'] = $telegramUserId;
            $linkUpdates['telegram_username'] = $this->identityService->nullableString($telegramFrom['username'] ?? null);
            $linkUpdates['telegram_first_name'] = $this->identityService->nullableString($telegramFrom['first_name'] ?? null);
            $linkUpdates['telegram_last_name'] = $this->identityService->nullableString($telegramFrom['last_name'] ?? null);
            $linkUpdates['telegram_photo_url'] = null;
            $linkUpdates['telegram_last_authenticated_at'] = now();
        }

        $user->update($linkUpdates);

        $this->identityService->enableNotifications($user);

        Log::info('Telegram linked to user', [
            'user_id' => $user->id,
            'chat_id' => $chatId,
        ]);

        $locale = $this->localeService->resolve($chatId, $user);
        $this->botApi->sendMessageWithWebAppButton(
            $chatId,
            $this->localeService->trans('linked', ['app_name' => config('app.name', 'Meo Mai Moi')], $locale),
            $this->localeService->trans('open_telegram_button', [], $locale),
        );
    }

    /** @param array<string, mixed> $message */
    private function handleHandshakeStart(string $nonce, string $chatId, array $message): void
    {
        $context = $this->handshakeService->context($nonce);
        if ($context === null) {
            $locale = $this->localeService->resolve(
                $chatId,
                null,
                null,
                $this->localeService->languageCodeFromMessage($message),
            );
            $this->botApi->sendMessage($chatId, $this->localeService->trans('invalid_login_handshake', [], $locale));

            return;
        }

        $telegramFrom = $message['from'] ?? null;
        if (! is_array($telegramFrom) || ! isset($telegramFrom['id'])) {
            $locale = $this->localeService->resolve($chatId, null, $context['locale'], null);
            $this->botApi->sendMessage($chatId, $this->localeService->trans('identify_error', [], $locale));

            return;
        }

        $context = $this->handshakeService->begin($nonce, (int) $telegramFrom['id']);
        if ($context === null) {
            $locale = $this->localeService->resolve($chatId, null, null, $telegramFrom['language_code'] ?? null);
            $this->botApi->sendMessage($chatId, $this->localeService->trans('invalid_login_handshake', [], $locale));

            return;
        }

        $existingUser = $this->identityService->findUser((int) $telegramFrom['id'], $chatId);
        if ($existingUser !== null) {
            $locale = $this->localeService->resolve(
                $chatId,
                $existingUser,
                $context['locale'],
                $telegramFrom['language_code'] ?? null,
            );
            $this->botApi->sendHandshakeConfirmation($chatId, $nonce, $locale, $context['user_code']);

            return;
        }

        $this->handshakeService->rememberForChat($nonce, $chatId);
        $knownLocale = $this->localeService->resolveKnown(
            $chatId,
            null,
            $context['locale'],
            $telegramFrom['language_code'] ?? null,
        );

        if ($knownLocale === null) {
            $this->botApi->sendLanguageSelection($chatId);

            return;
        }

        $this->localeService->cache($chatId, $knownLocale);
        $this->botApi->sendHandshakeCreateAccountKeyboard($chatId, $knownLocale, $context['user_code']);
    }

    /** @param array<string, mixed> $message */
    private function handleStartWithoutToken(string $chatId, array $message, ?string $redirectPath = null): void
    {
        $telegramFrom = $message['from'] ?? null;
        if (! $telegramFrom || ! isset($telegramFrom['id'])) {
            $locale = $this->localeService->resolve($chatId);
            $this->botApi->sendMessage($chatId, $this->localeService->trans('no_token', [
                'app_name' => config('app.name', 'Meo Mai Moi'),
                'url' => config('app.url', 'https://meomaimoi.com'),
            ], $locale));

            return;
        }

        $existingUser = $this->identityService->findUser((int) $telegramFrom['id'], $chatId);

        if ($existingUser) {
            $this->identityService->linkExistingUser($existingUser, $chatId, (int) $telegramFrom['id']);
            $this->sendAlreadyLinkedMessage($chatId, $existingUser, $redirectPath);

            return;
        }

        $knownLocale = $this->localeService->resolveKnown(
            $chatId,
            null,
            null,
            is_array($telegramFrom) ? ($telegramFrom['language_code'] ?? null) : null,
        );

        if ($knownLocale === null) {
            $this->botApi->sendLanguageSelection($chatId);

            return;
        }

        $this->localeService->cache($chatId, $knownLocale);
        $this->botApi->sendCreateAccountKeyboard($chatId, $knownLocale);
    }

    /** @param array<string, mixed> $message */
    private function handleCreateAccountFromStart(string $chatId, array $message, ?string $redirectPath = null): void
    {
        $telegramFrom = $message['from'] ?? null;
        if (! $telegramFrom || ! isset($telegramFrom['id'])) {
            $locale = $this->localeService->resolve($chatId);
            $this->botApi->sendMessage($chatId, $this->localeService->trans('identify_error', [], $locale));

            return;
        }

        $this->accountFlowService->create($chatId, null, $telegramFrom, $redirectPath);
    }

    private function sendAlreadyLinkedMessage(string $chatId, User $user, ?string $redirectPath): void
    {
        $locale = $this->localeService->resolve($chatId, $user);

        $this->botApi->sendMessageWithWebAppButton(
            $chatId,
            $this->localeService->trans('already_linked', ['app_name' => config('app.name', 'Meo Mai Moi')], $locale),
            $this->localeService->trans('open_telegram_button', [], $locale),
            $redirectPath,
        );
    }
}
