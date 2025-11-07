<?php

namespace App\Http\Responses\Auth;

use App\Services\EmailConfigurationService;
use App\Services\SettingsService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;

class RegisterResponse implements RegisterResponseContract
{
    private SettingsService $settingsService;

    private EmailConfigurationService $emailConfigurationService;

    public function __construct(SettingsService $settingsService, EmailConfigurationService $emailConfigurationService)
    {
        $this->settingsService = $settingsService;
        $this->emailConfigurationService = $emailConfigurationService;
    }

    /**
     * Create an HTTP response that represents the object.
     *
     * For SPA with cookie-based auth: user is already authenticated via session,
     * return success confirmation with user data
     */
    public function toResponse($request)
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        // Check if email verification is required
        $emailVerificationRequired = $this->settingsService->isEmailVerificationRequired();

        // Send email verification notification only if required
        $emailSent = false;
        $emailMessage = '';

        if ($emailVerificationRequired && ! $user->hasVerifiedEmail()) {
            // Check if email is configured before attempting to send
            if (! $this->emailConfigurationService->isEmailEnabled()) {
                $emailSent = false;
                $emailMessage = 'We are unable to send verification email at the moment. But hopefully admins are working on it and you will receive it soon.';
            } else {
                try {
                    // Idempotency guard: avoid sending more than once within short window
                    if ($this->shouldSendVerification($user)) {
                        $user->sendEmailVerificationNotification();
                    }
                    $emailSent = true;
                    $emailMessage = 'We\'ve sent a verification email to '.$user->email.'. Please check your inbox and click the link to verify your email address. If you did not receive the email, check your spam folder.';
                } catch (\Exception $e) {
                    // Log the error but don't fail registration
                    Log::warning('Email verification could not be sent during registration', [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'error' => $e->getMessage(),
                    ]);
                    $emailSent = false;
                    $emailMessage = 'We\'ve failed to send a verification email. But hopefully you will receive it soon.';
                }
            }
        } else {
            $emailMessage = 'Registration completed successfully. You can now access your account.';
        }

        // If the client expects HTML, redirect into the SPA
        if (! $request->expectsJson() && ! $request->wantsJson()) {
            $frontend = config('app.frontend_url');

            return redirect()->to($frontend);
        }

        // For SPA: return user data (authentication is via cookie, no tokens)
        $verifiedAt = $user->email_verified_at;
        if (is_string($verifiedAt)) {
            $verifiedAt = Carbon::parse($verifiedAt);
        }

        return response()->json([
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'email_verified_at' => $verifiedAt?->toISOString(),
                ],
                'email_verified' => $user->hasVerifiedEmail(),
                'email_sent' => $emailSent,
                'requires_verification' => $emailVerificationRequired && ! $user->hasVerifiedEmail(),
                'message' => $emailMessage,
            ],
        ], 201);
    }

    /**
     * Determine if we should send a verification email (simple time-based idempotency).
     */
    private function shouldSendVerification(\App\Models\User $user): bool
    {
        // If there is already a recent (last 30 seconds) verification notification of any status, skip.
        try {
            $window = (int) config('notifications.email_verification_idempotency_seconds', 30);
            $recent = $user->notifications()
                ->where('type', 'email_verification')
                ->where('created_at', '>=', now()->subSeconds($window))
                ->exists();

            return ! $recent;
        } catch (\Throwable $e) {
            // Fail open (send) if something goes wrong
            return true;
        }
    }
}
