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
        $returnUrl = $this->loginLinkService->returnUrl($returnToken['token']);

        // Nothing here can steer the browser button out of Telegram's in-app browser. It is a
        // client setting, and a text link in the message body was measured to behave
        // identically. Where the link lands is the frontend's problem to detect and handle.
        $text = $this->localeService->trans($messageKey, [
            'app_name' => config('app.name', 'Meo Mai Moi'),
            'name' => htmlspecialchars($user->name, ENT_QUOTES, 'UTF-8'),
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
