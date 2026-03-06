<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RejectPersonalAccessTokenAuth
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $bearerToken = $request->bearerToken();

        if (! is_string($bearerToken) || $bearerToken === '') {
            return $next($request);
        }

        $message = __('messages.api.token_management_session_only');

        return response()->json([
            'success' => false,
            'data' => null,
            'message' => $message,
            'error' => $message,
        ], 403);
    }
}
