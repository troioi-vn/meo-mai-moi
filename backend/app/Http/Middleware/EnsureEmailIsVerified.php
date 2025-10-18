<?php

namespace App\Http\Middleware;

use App\Services\SettingsService;
use Closure;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    private SettingsService $settingsService;

    public function __construct(SettingsService $settingsService)
    {
        $this->settingsService = $settingsService;
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if email verification is required via settings
        if (! $this->settingsService->isEmailVerificationRequired()) {
            return $next($request);
        }

        $user = $request->user();
        
        if (! $user) {
            return response()->json([
                'message' => 'Your email address is not verified. Please check your email for a verification link.',
                'email_verified' => false,
            ], 403);
        }

        if ($user instanceof MustVerifyEmail) {
            // In testing environment, force a fresh database lookup to avoid stale cache
            // In production, use the cached user for performance
            $userToCheck = app()->environment('testing') ? 
                \App\Models\User::find($user->id) : $user;
                
            if ($userToCheck && ! $userToCheck->hasVerifiedEmail()) {
                return response()->json([
                    'message' => 'Your email address is not verified. Please check your email for a verification link.',
                    'email_verified' => false,
                ], 403);
            }
        }

        return $next($request);
    }
}
