<?php

namespace App\Http\Responses\Auth;

use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Fortify\Http\Responses\LoginResponse as FortifyDefaultLoginResponse;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    private SettingsService $settingsService;

    public function __construct(SettingsService $settingsService)
    {
        $this->settingsService = $settingsService;
    }

    /**
     * Create an HTTP response that represents the object.
     */
    public function toResponse($request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        
        // For traditional web requests, redirect into the SPA instead of Jetstream dashboard
        if (! $request->expectsJson() && ! $request->wantsJson()) {
            $frontend = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173'));
            return redirect()->intended($frontend);
        }
        
        // Check if email verification is required and user is not verified
        $emailVerificationRequired = $this->settingsService->isEmailVerificationRequired();

        if ($emailVerificationRequired && !$user->hasVerifiedEmail()) {
            // Don't fully log in unverified users, but provide token for verification process
            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'data' => [
                    'access_token' => $token,
                    'token_type' => 'Bearer',
                    'email_verified' => false,
                    'requires_verification' => true,
                    'message' => 'Please verify your email address. We have sent you verification link to your email.',
                ]
            ]);
        }

        // Create token for verified users
        $token = $user->createToken('auth_token')->plainTextToken;

        // Preserve existing JSON response format for successful login
        return response()->json([
            'data' => [
                'access_token' => $token,
                'token_type' => 'Bearer',
                'email_verified' => $user->hasVerifiedEmail(),
            ]
        ]);
    }
}