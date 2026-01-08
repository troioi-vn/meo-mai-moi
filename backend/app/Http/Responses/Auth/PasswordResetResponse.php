<?php

namespace App\Http\Responses\Auth;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Laravel\Fortify\Contracts\PasswordResetResponse as PasswordResetResponseContract;

class PasswordResetResponse implements PasswordResetResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     */
    public function toResponse($request): JsonResponse
    {
        Log::info('DEBUG: PasswordResetResponse::toResponse', [
            'email' => $request->input('email'),
            'status' => $request->get('status'),
            'is_authenticated' => Auth::check(),
            'authenticated_user_id' => Auth::id(),
        ]);

        // Log out the current session after password reset.
        // This forces the user to login with their new password, which is
        // especially important for OAuth users setting their first password.
        // It also invalidates any stale session data (password_hash_web).
        if (Auth::check()) {
            Log::info('DEBUG: PasswordResetResponse logging out user', [
                'user_id' => Auth::id(),
            ]);
            
            // Invalidate current session and regenerate CSRF token
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            
            // Log out from all guards
            Auth::guard('web')->logout();
        }

        // Preserve existing JSON response format
        return response()->json([
            'data' => [
                'message' => __('Password reset successfully.'),
            ],
        ]);
    }
}
