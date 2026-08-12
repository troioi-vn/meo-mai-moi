<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Services\FrontendPathService;
use Illuminate\Support\Facades\Cache;

class TelegramLoginRedirectService
{
    public function __construct(
        private readonly FrontendPathService $frontendPathService,
    ) {}

    public function resolve(?string $param, string $chatId): ?string
    {
        if (! is_string($param) || ! str_starts_with($param, 'login_')) {
            return null;
        }

        $redirectToken = substr($param, strlen('login_'));
        if ($redirectToken === '') {
            return null;
        }

        $redirectPath = Cache::get("telegram-login-redirect:{$redirectToken}");
        $redirectPath = $this->frontendPathService->sanitize($redirectPath);

        if ($redirectPath !== null) {
            Cache::put("telegram-login-redirect-chat:{$chatId}", $redirectPath, now()->addMinutes(30));
        }

        return $redirectPath;
    }

    public function consume(string $chatId): ?string
    {
        $redirectPath = Cache::pull("telegram-login-redirect-chat:{$chatId}");

        return $this->frontendPathService->sanitize($redirectPath);
    }
}
