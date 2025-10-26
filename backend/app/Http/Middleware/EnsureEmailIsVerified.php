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
        $required = $this->settingsService->isEmailVerificationRequired();
        if (! $required) {
            return $next($request);
        }

        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Your email address is not verified. Please check your email for a verification link.',
                'email_verified' => false,
            ], 403);
        }

        // If an Authorization bearer token is present and appears to reference a different user,
        // prefer the user resolved from that token to avoid any guard/default-driver leakage.
        $effectiveUser = $user;
        $authHeader = $request->header('Authorization');
        if ($authHeader && preg_match('/Bearer\s+(\d+)\|/i', $authHeader, $m)) {
            $tokenId = (int) $m[1];
            $pat = \Laravel\Sanctum\PersonalAccessToken::find($tokenId);
            if ($pat && $pat->tokenable_type === \App\Models\User::class) {
                $tokenUser = \App\Models\User::find($pat->tokenable_id);
                if ($tokenUser) {
                    $effectiveUser = $tokenUser;
                }
            }
        }

        if ($effectiveUser instanceof MustVerifyEmail) {
            // Always do a fresh database lookup to avoid stale cache issues with Sanctum tokens
            // This ensures we get the most up-to-date verification status
            $userToCheck = \App\Models\User::find($effectiveUser->id);

            if ($userToCheck && ! $userToCheck->hasVerifiedEmail()) {
                return response()->json([
                    'message' => 'Your email address is not verified. Please check your email for a verification link.',
                    'email_verified' => false,
                ], 403);
            }
        } else {
            // If user does not implement MustVerifyEmail, allow through
        }

        return $next($request);
    }
}
