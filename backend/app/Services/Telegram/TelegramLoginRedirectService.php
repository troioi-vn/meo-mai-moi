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

    public function resolve(?string $param): ?string
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

        return $redirectPath;
    }
}
