<?php

declare(strict_types=1);

namespace App\Http\Controllers\Demo;

use App\Models\User;
use App\Services\Demo\DemoLoginTokenService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ConsumeDemoLoginTokenController
{
    public function __invoke(Request $request, DemoLoginTokenService $demoLoginTokenService): Response|RedirectResponse
    {
        $token = (string) $request->query('token', '');

        if (! $demoLoginTokenService->consume($token)) {
            return response('Invalid or expired demo login token.', 403)
                ->header('Cache-Control', 'no-store, no-cache, must-revalidate');
        }

        $demoUser = User::query()->where('email', config('demo.user_email'))->first();

        if (! $demoUser) {
            return response('Demo user is unavailable.', 503)
                ->header('Cache-Control', 'no-store, no-cache, must-revalidate');
        }

        Auth::guard('web')->login($demoUser);
        $request->session()->regenerate();

        return redirect()->to((string) config('demo.redirect_path', '/'));
    }
}
