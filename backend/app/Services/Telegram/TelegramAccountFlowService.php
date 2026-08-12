<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Models\User;

class TelegramAccountFlowService
{
    public function __construct(
        private readonly TelegramLoginLinkService $loginLinkService,
        private readonly TelegramLocaleService $localeService,
        private readonly TelegramBotApiService $botApi,
    ) {}

    /**
     * Every message that ends a bot conversation offers the same two ways in, so the caller
     * only chooses the wording.
     */
    public function sendLoginOptions(
        string $chatId,
        User $user,
        string $locale,
        ?string $redirectPath,
        string $messageKey,
    ): void {
        $returnToken = $this->loginLinkService->issueReturnToken($user, $redirectPath);
        $returnUrl = rtrim((string) config('app.url', 'https://meomaimoi.com'), '/')
            .'/auth/telegram/return?'.http_build_query(['token' => $returnToken['token']]);

        $text = $this->localeService->trans($messageKey, [
            'app_name' => config('app.name', 'Meo Mai Moi'),
            'name' => htmlspecialchars($user->name, ENT_QUOTES, 'UTF-8'),
        ], $locale);

        // Telegram gives bots no way to force a url button out of its in-app browser — that
        // is purely a client setting. A text link is the same URL reached by a different
        // affordance, and can be long-pressed for the client's own "open in" menu.
        $text .= "\n\n".$this->localeService->trans('open_browser_link', [
            'url' => $returnUrl,
        ], $locale);

        $this->botApi->sendMessageWithLoginOptions(
            $chatId,
            $text,
            $this->localeService->trans('open_browser_button', [], $locale),
            $returnUrl,
            $this->localeService->trans('open_telegram_button', [], $locale),
            $redirectPath,
        );
    }
}
