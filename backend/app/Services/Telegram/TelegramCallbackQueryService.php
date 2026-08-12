<?php

declare(strict_types=1);

namespace App\Services\Telegram;

class TelegramCallbackQueryService
{
    public function __construct(
        private readonly TelegramLoginHandshakeService $handshakeService,
        private readonly TelegramLocaleService $localeService,
        private readonly TelegramIdentityService $identityService,
        private readonly TelegramAccountFlowService $accountFlowService,
        private readonly TelegramBotApiService $botApi,
    ) {}

    /** @param array<string, mixed> $callbackQuery */
    public function handle(array $callbackQuery): void
    {
        $callbackData = $callbackQuery['data'] ?? '';
        $callbackQueryId = $callbackQuery['id'] ?? '';
        $chatId = (string) ($callbackQuery['message']['chat']['id'] ?? '');
        $telegramFrom = $callbackQuery['from'] ?? null;

        if (! $chatId || ! $telegramFrom) {
            return;
        }

        if (is_string($callbackData) && preg_match('/^hs_(ok|no)_([A-Za-z0-9]{32})$/', $callbackData, $matches) === 1) {
            $this->handleHandshakeConfirmation(
                $matches[1],
                $matches[2],
                $chatId,
                is_array($telegramFrom) ? $telegramFrom : [],
                is_string($callbackQueryId) ? $callbackQueryId : '',
            );

            return;
        }

        if (isset(TelegramLocaleService::LANGUAGE_OPTIONS[$callbackData])) {
            $this->handleLanguageSelection($chatId, $callbackQueryId, $callbackData);

            return;
        }

        if ($callbackData === 'create_account') {
            $this->accountFlowService->create($chatId, $callbackQueryId, $telegramFrom);
        } else {
            $this->botApi->answerCallbackQuery($callbackQueryId);
        }
    }

    private function handleLanguageSelection(string $chatId, string $callbackQueryId, string $callbackData): void
    {
        $locale = TelegramLocaleService::LANGUAGE_OPTIONS[$callbackData]['locale'];

        $this->localeService->cache($chatId, $locale);

        $this->botApi->answerCallbackQuery($callbackQueryId);

        $handshakeNonce = $this->handshakeService->nonceForChat($chatId);
        $handshakeContext = $handshakeNonce !== null ? $this->handshakeService->context($handshakeNonce) : null;

        if ($handshakeContext !== null) {
            $this->botApi->sendHandshakeCreateAccountKeyboard($chatId, $locale, $handshakeContext['user_code']);

            return;
        }

        $this->botApi->sendCreateAccountKeyboard($chatId, $locale);
    }

    /** @param array<string, mixed> $telegramFrom */
    private function handleHandshakeConfirmation(
        string $action,
        string $nonce,
        string $chatId,
        array $telegramFrom,
        string $callbackQueryId,
    ): void {
        $telegramUserId = isset($telegramFrom['id']) ? (int) $telegramFrom['id'] : 0;
        $locale = $this->localeService->resolve(
            $chatId,
            $this->identityService->findUser($telegramUserId, $chatId),
        );

        if ($telegramUserId <= 0) {
            $this->botApi->answerCallbackQuery($callbackQueryId);

            return;
        }

        if ($action === 'no') {
            if ($this->handshakeService->cancel($nonce, $telegramUserId)) {
                $this->handshakeService->forgetChat($chatId);
                $this->botApi->answerCallbackQuery($callbackQueryId);
                $this->botApi->sendMessage(
                    $chatId,
                    $this->localeService->trans('browser_sign_in_cancelled', [], $locale),
                );
            } else {
                $this->botApi->answerCallbackQuery(
                    $callbackQueryId,
                    $this->localeService->trans('invalid_login_handshake', [], $locale),
                );
            }

            return;
        }

        $user = $this->identityService->findUser($telegramUserId, $chatId);
        if ($user === null || ! $this->handshakeService->approveForTelegramUser($nonce, $telegramUserId, $user)) {
            $this->botApi->answerCallbackQuery(
                $callbackQueryId,
                $this->localeService->trans('invalid_login_handshake', [], $locale),
            );

            return;
        }

        $this->identityService->linkExistingUser($user, $chatId, $telegramUserId);
        $this->botApi->answerCallbackQuery($callbackQueryId);
        $context = $this->handshakeService->context($nonce);
        $this->accountFlowService->sendApprovedHandshakeReply(
            $chatId,
            $user,
            $locale,
            $context['redirect_path'] ?? null,
        );
    }
}
