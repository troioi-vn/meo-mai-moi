<?php

declare(strict_types=1);

namespace App\Http\Controllers\Telegram;

use App\Services\Telegram\TelegramLoginLinkService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ConsumeTelegramLoginReturnController
{
    public function __invoke(Request $request, TelegramLoginLinkService $loginLinkService): RedirectResponse
    {
        $result = $loginLinkService->consumeReturnToken((string) $request->query('token', ''));

        if ($result === null) {
            return redirect('/login?via=telegram&expired=telegram')->header('Referrer-Policy', 'no-referrer');
        }

        Auth::guard('web')->login($result['user'], true);
        $request->session()->regenerate();

        return redirect()->to($this->withTelegramMarker($result['redirect_path'] ?? '/'))
            ->header('Referrer-Policy', 'no-referrer');
    }

    /**
     * Tells the frontend this page load arrived from a Telegram link, which is the one moment
     * it can know the session may be stranded in an in-app webview and offer a way out.
     */
    private function withTelegramMarker(string $path): string
    {
        $parts = parse_url($path);
        if ($parts === false) {
            return $path;
        }

        parse_str($parts['query'] ?? '', $query);
        $query['from'] = 'telegram';

        return ($parts['path'] ?? '/')
            .'?'.http_build_query($query)
            .(isset($parts['fragment']) ? '#'.$parts['fragment'] : '');
    }
}
