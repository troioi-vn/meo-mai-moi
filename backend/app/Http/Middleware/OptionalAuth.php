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
                // For personal access tokens, auth:sanctum middleware isn't applied on optional routes,
                // so resolve the token manually and set the authenticated user.
                try {
                    $token = \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken());
                    if ($token) {
                        $user = $token->tokenable;
                    } else {
                        // Fallback attempt: if Sanctum already authenticated via middleware, use the guard
                        $user = Auth::guard('sanctum')->user();
                    }
                } catch (\Throwable $e) {
                    // Ignore and continue to session-based auth fallback
                }
            }

            // If there's no bearer token or Sanctum didn't resolve, check existing session (web guard)
            if (! $user) {
                $user = Auth::guard('web')->user();
            }

            if ($user && $user instanceof \Illuminate\Contracts\Auth\Authenticatable) {
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
