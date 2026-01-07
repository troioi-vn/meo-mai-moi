<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Actions\Fortify\UpdateUserPassword;
use App\Actions\Fortify\UpdateUserProfileInformation;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Fortify\Actions\RedirectIfTwoFactorAuthenticatable;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Response bindings moved to AppServiceProvider::boot()
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Allow Fortify to register its routes (web endpoints like /register, /forgot-password, 2FA, etc.)
        $this->configureFortifyActions();

        // Configure rate limiters to match existing throttling behavior
        $this->configureRateLimiters();

        // DEBUG: Custom authentication with logging
        $this->configureAuthenticationLogging();
    }

    /**
     * Configure Fortify actions in service container
     */
    private function configureFortifyActions(): void
    {
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::updateUserProfileInformationUsing(UpdateUserProfileInformation::class);
        Fortify::updateUserPasswordsUsing(UpdateUserPassword::class);
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::redirectUserForTwoFactorAuthenticationUsing(RedirectIfTwoFactorAuthenticatable::class);
    }

    /**
     * DEBUG: Add authentication logging to trace login issues
     */
    private function configureAuthenticationLogging(): void
    {
        Fortify::authenticateUsing(function (Request $request) {
            $email = $request->input(Fortify::username());
            $password = $request->input('password');

            Log::info('Login attempt', [
                'email' => $email,
                'password_length' => strlen($password ?? ''),
                'accepts_json' => $request->expectsJson(),
                'accept_header' => $request->header('Accept'),
                'content_type' => $request->header('Content-Type'),
                'x_requested_with' => $request->header('X-Requested-With'),
                'user_agent' => Str::limit($request->userAgent(), 50),
            ]);

            $user = User::where('email', $email)->first();

            if (! $user) {
                Log::warning('Login failed: User not found', ['email' => $email]);

                return null;
            }

            Log::info('Login: User found', [
                'user_id' => $user->id,
                'email' => $user->email,
                'has_password' => ! empty($user->password),
                'password_hash_prefix' => $user->password ? substr($user->password, 0, 20).'...' : 'null',
            ]);

            if (! $user->password) {
                Log::warning('Login failed: User has no password set', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                ]);

                return null;
            }

            $passwordValid = Hash::check($password, $user->password);

            Log::info('Login: Password check', [
                'user_id' => $user->id,
                'password_valid' => $passwordValid,
            ]);

            if ($passwordValid) {
                return $user;
            }

            Log::warning('Login failed: Invalid password', [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);

            return null;
        });
    }

    /**
     * Configure rate limiters to match existing throttling behavior
     */
    private function configureRateLimiters(): void
    {
        // Login rate limiting (matches existing AuthController throttling)
        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            // Allow more login attempts for development/testing environments
            if (app()->environment('local', 'development', 'e2e', 'testing')) {
                return Limit::perMinute(100)->by($throttleKey);
            }

            return Limit::perMinute(5)->by($throttleKey);
        });

        // Two-factor authentication rate limiting
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        // Password reset rate limiting (matches existing forgot password throttling)
        RateLimiter::for('password-reset', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        // Registration rate limiting for additional security
        RateLimiter::for('registration', function (Request $request) {
            if (app()->environment('testing')) {
                return Limit::perMinute(10)->by($request->session()->getId());
            }

            return Limit::perMinute(10)->by($request->ip());
        });
    }
}
