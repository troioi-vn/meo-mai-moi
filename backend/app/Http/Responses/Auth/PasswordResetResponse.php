<?php

namespace App\Http\Responses\Auth;

use Illuminate\Http\JsonResponse;
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
        ]);

        // Preserve existing JSON response format
        return response()->json([
            'data' => [
                'message' => __('Password reset successfully.'),
            ],
        ]);
    }
}
