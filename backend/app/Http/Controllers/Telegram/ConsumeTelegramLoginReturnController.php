<?php

declare(strict_types=1);

namespace App\Http\Controllers\Telegram;

use App\Services\Telegram\TelegramLoginHandshakeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ConsumeTelegramLoginReturnController
{
    public function __invoke(Request $request, TelegramLoginHandshakeService $handshakeService): RedirectResponse
    {
        $result = $handshakeService->consumeReturnToken((string) $request->query('token', ''));

        if ($result === null) {
            return redirect('/login?via=telegram');
        }

        Auth::guard('web')->login($result['user'], true);
        $request->session()->regenerate();

        return redirect()->to($result['redirect_path'] ?? '/');
    }
}
