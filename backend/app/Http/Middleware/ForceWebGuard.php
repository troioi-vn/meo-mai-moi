<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ForceWebGuard
{
    /**
     * Ensure the default auth guard is set to 'web' for web routes.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Force the web guard for the duration of this request to avoid any leakage
        // from previous API/sanctum requests that may have changed the default guard.
        Auth::shouldUse('web');

        // If a user is authenticated via Sanctum but not via the web guard,
        // mirror the authenticated user onto the web guard for this request.
        if (Auth::guard('sanctum')->check() && ! Auth::guard('web')->check()) {
            Auth::guard('web')->setUser(Auth::guard('sanctum')->user());
        }

        return $next($request);
    }
}
