<?php

declare(strict_types=1);

namespace App\Http\Responses\Auth;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\PasswordResetResponse as PasswordResetResponseContract;

class PasswordResetResponse implements PasswordResetResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     */
    public function toResponse($request): JsonResponse
    {
        // Log out the current session after password reset.
        // This forces the user to login with their new password, which is
        // especially important for OAuth users setting their first password.
        // It also invalidates any stale session data (password_hash_web).
        if (Auth::check()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            Auth::guard('web')->logout();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'message' => __('Password reset successfully.'),
                'redirect' => '/login',
            ],
        ]);
    }
}
