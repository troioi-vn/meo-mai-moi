<?php

declare(strict_types=1);

namespace App\Http\Responses\Auth;

use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     *
     * For SPA with cookie-based auth: return JSON for API requests,
     * redirect to frontend for web requests
     */
    public function toResponse($request)
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        // For JSON requests (SPA): return user data
        if ($request->expectsJson()) {
            return response()->json([
                'data' => [
                    'user' => $user,
                    'two_factor' => false,
                ],
            ], 200);
        }

        // For web requests: redirect to frontend
        return redirect()->intended(config('app.frontend_url'));
    }
}
