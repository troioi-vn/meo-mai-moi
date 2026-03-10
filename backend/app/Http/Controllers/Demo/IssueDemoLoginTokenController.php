<?php

declare(strict_types=1);

namespace App\Http\Controllers\Demo;

use App\Models\User;
use App\Services\Demo\DemoLoginTokenService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class IssueDemoLoginTokenController
{
    use ApiResponseTrait;

    public function __invoke(Request $request, DemoLoginTokenService $demoLoginTokenService)
    {
        $demoUser = User::query()->where('email', config('demo.user_email'))->first();

        if (! $demoUser) {
            return $this->sendError('Demo is currently unavailable.', 503);
        }

        $issued = $demoLoginTokenService->issue(
            $request->headers->get('Origin') ?: $request->headers->get('Referer') ?: $request->ip(),
        );

        return $this->sendSuccess([
            'token' => $issued['token'],
            'login_url' => route('demo.login', ['token' => $issued['token']]),
            'expires_at' => $issued['expires_at']->toIso8601String(),
        ]);
    }
}
