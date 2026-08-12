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

    public function sendLoginOptions(
        string $chatId,
        User $user,
        string $locale,
        ?string $redirectPath,
        bool $created,
    ): void {
        $returnToken = $this->loginLinkService->issueReturnToken($user, $redirectPath);
        $returnUrl = rtrim((string) config('app.url', 'https://meomaimoi.com'), '/')
            .'/auth/telegram/return?'.http_build_query(['token' => $returnToken['token']]);

        $this->botApi->sendMessageWithLoginOptions(
            $chatId,
            $this->localeService->trans(
                $created ? 'welcome_created' : 'welcome_back',
                $created
                    ? ['app_name' => config('app.name', 'Meo Mai Moi')]
                    : ['name' => htmlspecialchars($user->name, ENT_QUOTES, 'UTF-8')],
                $locale,
            ),
            $this->localeService->trans('open_browser_button', [], $locale),
            $returnUrl,
            $this->localeService->trans('open_telegram_button', [], $locale),
            $redirectPath,
        );
    }
}
