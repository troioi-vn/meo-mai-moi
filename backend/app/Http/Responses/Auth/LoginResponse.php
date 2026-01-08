<?php

namespace App\Http\Responses\Auth;

use Illuminate\Support\Facades\Log;
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

        Log::info('LoginResponse::toResponse', [
            'has_user' => $user !== null,
            'user_id' => $user?->id,
            'expects_json' => $request->expectsJson(),
            'accept_header' => $request->header('Accept'),
        ]);

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
