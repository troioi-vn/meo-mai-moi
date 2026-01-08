<?php

namespace App\Providers;

use App\Events\HelperProfileStatusUpdated;
use App\Listeners\CreateHelperProfileNotification;
use App\Listeners\UpdateEmailLogOnSent;
use App\Models\Notification;
use App\Observers\NotificationObserver;
use Illuminate\Auth\Events\Attempting;
use Illuminate\Auth\Events\Authenticated;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    // (Legacy CatPolicy mapping removed after pet-only migration.)

    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Services\EmailConfigurationService::class);
        $this->app->singleton(\App\Services\Notifications\WebPushDispatcher::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Override Fortify response classes for cookie-based SPA authentication
        // Must be done in boot() to override package bindings
        $this->app->bind(\Laravel\Fortify\Contracts\LoginResponse::class, \App\Http\Responses\Auth\LoginResponse::class);
        $this->app->bind(\Laravel\Fortify\Contracts\RegisterResponse::class, \App\Http\Responses\Auth\RegisterResponse::class);
        $this->app->bind(\Laravel\Fortify\Contracts\LogoutResponse::class, \App\Http\Responses\Auth\LogoutResponse::class);
        $this->app->bind(\Laravel\Fortify\Contracts\PasswordResetResponse::class, \App\Http\Responses\Auth\PasswordResetResponse::class);
        $this->app->bind(\Laravel\Fortify\Contracts\SuccessfulPasswordResetLinkRequestResponse::class, \App\Http\Responses\Auth\SuccessfulPasswordResetLinkRequestResponse::class);

        Event::listen(
            HelperProfileStatusUpdated::class,
            CreateHelperProfileNotification::class
        );

        // DEBUG: Log all authentication events
        Event::listen(Attempting::class, function ($event) {
            Log::info('DEBUG: Auth Attempting', [
                'guard' => $event->guard,
                'email' => $event->credentials['email'] ?? 'no-email',
                'has_password' => isset($event->credentials['password']),
            ]);
        });

        Event::listen(Authenticated::class, function ($event) {
            Log::info('DEBUG: Auth Authenticated', [
                'guard' => $event->guard,
                'user_id' => $event->user->id,
            ]);
        });

        Event::listen(Failed::class, function ($event) {
            Log::info('DEBUG: Auth Failed', [
                'guard' => $event->guard,
                'email' => $event->credentials['email'] ?? 'no-email',
                'user_found' => $event->user ? 'yes' : 'no',
            ]);
        });

        Event::listen(Login::class, function ($event) {
            Log::info('DEBUG: Auth Login Success', [
                'guard' => $event->guard,
                'user_id' => $event->user->id,
                'remember' => $event->remember,
            ]);
        });

        // Listen for successful email sending to update EmailLog entries
        Event::listen(
            MessageSent::class,
            UpdateEmailLogOnSent::class
        );

        Notification::observe(NotificationObserver::class);

        // Register custom notification channel for email verification
        $this->app->make('Illuminate\Notifications\ChannelManager')
            ->extend('notification_email', function () {
                return new \App\Channels\NotificationEmailChannel;
            });

        // Update mail configuration on application boot if there's an active email configuration
        try {
            $emailConfigService = $this->app->make(\App\Services\EmailConfigurationService::class);
            $emailConfigService->updateMailConfig();
        } catch (\Exception $e) {
            // Silently fail during boot to prevent application startup issues
            // The error will be logged by the service; add trace at debug level for development
            \Log::debug('EmailConfigurationService bootstrap suppressed error', [
                'error' => $e->getMessage(),
            ]);
        }

        // If APP_URL is configured with https, force URL generation to use https as well.
        // This helps prevent mixed-content links when behind an SSL-terminating reverse proxy.
        if (str_starts_with(config('app.url', ''), 'https://')) {
            \URL::forceScheme('https');
        }
    }
}
