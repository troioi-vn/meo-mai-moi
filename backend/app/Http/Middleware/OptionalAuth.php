<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class OptionalAuth
{
    /**
     * Handle an incoming request.
     * 
     * This middleware attempts to authenticate the user but doesn't fail if authentication fails.
     * This allows routes to work for both authenticated and non-authenticated users.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Try to authenticate using Sanctum, but don't fail if it doesn't work
        if ($request->bearerToken()) {
            try {
                $user = Auth::guard('sanctum')->user();
                if ($user) {
                    Auth::setUser($user);
                    $request->setUserResolver(function () use ($user) {
                        return $user;
                    });
                }
            } catch (\Exception $e) {
                // Authentication failed, but that's okay for optional auth
                // Continue without authentication
            }
        }

        return $next($request);
    }
}
