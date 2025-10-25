<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Actions\Fortify\UpdateUserPassword;
use App\Actions\Fortify\UpdateUserProfileInformation;
use App\Http\Responses\Auth\LoginResponse;
use App\Http\Responses\Auth\LogoutResponse;
use App\Http\Responses\Auth\PasswordResetResponse;
use App\Http\Responses\Auth\RegisterResponse;
use App\Http\Responses\Auth\SuccessfulPasswordResetLinkRequestResponse;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Fortify\Actions\RedirectIfTwoFactorAuthenticatable;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Fortify\Contracts\LogoutResponse as LogoutResponseContract;
use Laravel\Fortify\Contracts\PasswordResetResponse as PasswordResetResponseContract;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;
use Laravel\Fortify\Contracts\SuccessfulPasswordResetLinkRequestResponse as SuccessfulPasswordResetLinkRequestResponseContract;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bind Fortify responses
        $this->bindFortifyResponses();
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Allow Fortify to register its routes (web endpoints like /register, /forgot-password, 2FA, etc.)
        // API endpoints remain under /api and are unchanged.
        $this->configureFortifyActions();

        // Configure rate limiters to match existing throttling behavior
        $this->configureRateLimiters();
    }

    // Removed obsolete AUTH_DRIVER gating; Fortify is always active

    /**
     * Bind custom response classes to Fortify contracts
     */
    private function bindFortifyResponses(): void
    {
        $this->app->singleton(RegisterResponseContract::class, RegisterResponse::class);
        $this->app->singleton(LoginResponseContract::class, LoginResponse::class);
        $this->app->singleton(LogoutResponseContract::class, LogoutResponse::class);
        $this->app->singleton(PasswordResetResponseContract::class, PasswordResetResponse::class);
        $this->app->singleton(SuccessfulPasswordResetLinkRequestResponseContract::class, SuccessfulPasswordResetLinkRequestResponse::class);
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
     * Configure rate limiters to match existing throttling behavior
     */
    private function configureRateLimiters(): void
    {
        // Login rate limiting (matches existing AuthController throttling)
        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());
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
            return Limit::perMinute(10)->by($request->ip());
        });
    }
}
