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
        // Try to authenticate using Sanctum token if present, otherwise fall back to session-authenticated user.
        try {
            $user = null;
            if ($request->bearerToken()) {
                $user = Auth::guard('sanctum')->user();
            }

            // If there's no bearer token or Sanctum didn't resolve, check existing session (web guard)
            if (!$user) {
                $user = Auth::guard('web')->user();
            }

            if ($user) {
                Auth::setUser($user);
                $request->setUserResolver(function () use ($user) {
                    return $user;
                });
            }
        } catch (\Exception $e) {
            // Ignore auth errors for optional auth
        }

        return $next($request);
    }
}
