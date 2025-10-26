<?php

namespace App\Http\Responses\Auth;

use App\Services\EmailConfigurationService;
use App\Models\User;
use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
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

        // Fortify should have logged the user in already; if not, attempt a defensive login
        if (! $user) {
            $email = $request->input('email');
            if ($email) {
                /** @var User|null $found */
                $found = User::where('email', $email)->first();
                if ($found) {
                    Auth::guard(config('fortify.guard', 'web'))->login($found);
                    $user = $found;
                }
            }
        }
        
        // Check if email verification is required
        $emailVerificationRequired = $this->settingsService->isEmailVerificationRequired();
        
        // Send email verification notification only if required
        $emailSent = false;
        $emailMessage = '';

        if ($emailVerificationRequired && !$user->hasVerifiedEmail()) {
            // Check if email is configured before attempting to send
            if (!$this->emailConfigurationService->isEmailEnabled()) {
                $emailSent = false;
                $emailMessage = 'We are unable to send verification email at the moment. But hopefully admins are working on it and you will receive it soon.';
            } else {
                try {
                    $user->sendEmailVerificationNotification();
                    $emailSent = true;
                    $emailMessage = 'We\'ve sent a verification email to ' . $user->email . '. Please check your inbox and click the link to verify your email address. If you did not receive the email, check your spam folder.';
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
            $frontend = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173'));
            return redirect()->to($frontend);
        }

        // For SPA: return user data (authentication is via cookie, no tokens)
        return response()->json([
            'data' => [
                'user' => $user,
                'email_verified' => $user->hasVerifiedEmail(),
                'email_sent' => $emailSent,
                'requires_verification' => $emailVerificationRequired && !$user->hasVerifiedEmail(),
                'message' => $emailMessage,
            ]
        ], 201);
    }
}