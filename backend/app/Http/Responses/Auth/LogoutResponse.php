<?php

declare(strict_types=1);

namespace App\Http\Responses\Auth;

use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\LogoutResponse as LogoutResponseContract;

class LogoutResponse implements LogoutResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     *
     * For SPA: return success message with redirect info
     */
    public function toResponse($request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'message' => 'Logged out successfully',
                'redirect' => '/login',
            ],
        ]);
    }
}
