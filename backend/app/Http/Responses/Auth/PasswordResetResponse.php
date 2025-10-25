<?php

namespace App\Http\Responses\Auth;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Fortify\Contracts\PasswordResetResponse as PasswordResetResponseContract;

class PasswordResetResponse implements PasswordResetResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     */
    public function toResponse($request): JsonResponse
    {
        // Preserve existing JSON response format
        return response()->json([
            'data' => [
                'message' => __('Password reset successfully.')
            ]
        ]);
    }
}