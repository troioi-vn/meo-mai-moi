<?php

declare(strict_types=1);

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Actions\Fortify\UpdateUserPassword;
use App\Actions\Fortify\UpdateUserProfileInformation;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
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
        // Configure Fortify actions
        $this->configureFortifyActions();

        // Configure rate limiters
        $this->configureRateLimiters();
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
    }

    /**
     * Configure rate limiters to match existing throttling behavior
     */
    private function configureRateLimiters(): void
    {
        // Login rate limiting
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

        // Password reset rate limiting
        RateLimiter::for('password-reset', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        // Registration rate limiting
        RateLimiter::for('registration', function (Request $request) {
            if (app()->environment('testing')) {
                return Limit::perMinute(10)->by($request->session()->getId());
            }

            return Limit::perMinute(10)->by($request->ip());
        });
    }
}
