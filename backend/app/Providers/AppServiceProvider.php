<?php

declare(strict_types=1);

namespace App\Providers;

use App\Channels\NotificationEmailChannel;
use App\Contracts\GroupLedgerSynchronization;
use App\Enums\PetStatus;
use App\Enums\ResourceInvitationType;
use App\Events\HelperProfileStatusUpdated;
use App\Events\InvitationEmailRequested;
use App\Events\WaitlistConfirmationRequested;
use App\Listeners\CreateHelperProfileNotification;
use App\Listeners\RecordMediaImageDimensions;
use App\Listeners\SendInvitationEmail;
use App\Listeners\SendWaitlistConfirmationEmail;
use App\Listeners\UpdateEmailLogOnSent;
use App\Models\Notification;
use App\Models\Pet;
use App\Observers\NotificationObserver;
use App\Services\EmailConfigurationService;
use App\Services\Finance\LedgerGroupSynchronization;
use App\Services\Notifications\Actions\CityUnapproveNotificationActionHandler;
use App\Services\Notifications\Actions\NotificationActionRegistry;
use App\Services\Notifications\WebPushDispatcher;
use App\Services\PetDeletionLifecycleService;
use App\Services\ResourceInvitations\GroupResourceInvitationHandler;
use App\Services\ResourceInvitations\LedgerResourceInvitationHandler;
use App\Services\ResourceInvitations\PetResourceInvitationHandler;
use App\Services\ResourceInvitations\ResourceInvitationHandlerRegistry;
use App\Services\Translation\TranslationSettingsService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Fortify\Contracts\LoginResponse;
use Laravel\Fortify\Contracts\LogoutResponse;
use Laravel\Fortify\Contracts\PasswordResetResponse;
use Laravel\Fortify\Contracts\RegisterResponse;
use Laravel\Fortify\Contracts\SuccessfulPasswordResetLinkRequestResponse;
use Spatie\MediaLibrary\MediaCollections\Events\MediaHasBeenAddedEvent;

class AppServiceProvider extends ServiceProvider
{
    // (Legacy CatPolicy mapping removed after pet-only migration.)

    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(EmailConfigurationService::class);
        $this->app->singleton(TranslationSettingsService::class);
        $this->app->singleton(WebPushDispatcher::class);

        $this->app->singleton(GroupLedgerSynchronization::class, LedgerGroupSynchronization::class);

        $this->app->singleton(ResourceInvitationHandlerRegistry::class, function ($app) {
            $registry = new ResourceInvitationHandlerRegistry;
            $registry->register(
                ResourceInvitationType::PET,
                $app->make(PetResourceInvitationHandler::class)
            );
            $registry->register(
                ResourceInvitationType::GROUP,
                $app->make(GroupResourceInvitationHandler::class)
            );
            $registry->register(
                ResourceInvitationType::LEDGER,
                $app->make(LedgerResourceInvitationHandler::class)
            );

            return $registry;
        });

        $this->app->singleton(NotificationActionRegistry::class, function ($app) {
            $registry = new NotificationActionRegistry;

            // Built-in action handlers
            $registry->register($app->make(CityUnapproveNotificationActionHandler::class));

            return $registry;
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Override Fortify response classes for cookie-based SPA authentication
        // Must be done in boot() to override package bindings
        $this->app->bind(LoginResponse::class, \App\Http\Responses\Auth\LoginResponse::class);
        $this->app->bind(RegisterResponse::class, \App\Http\Responses\Auth\RegisterResponse::class);
        $this->app->bind(LogoutResponse::class, \App\Http\Responses\Auth\LogoutResponse::class);
        $this->app->bind(PasswordResetResponse::class, \App\Http\Responses\Auth\PasswordResetResponse::class);
        $this->app->bind(SuccessfulPasswordResetLinkRequestResponse::class, \App\Http\Responses\Auth\SuccessfulPasswordResetLinkRequestResponse::class);

        Event::listen(
            HelperProfileStatusUpdated::class,
            CreateHelperProfileNotification::class
        );

        Event::listen(
            InvitationEmailRequested::class,
            SendInvitationEmail::class
        );

        Event::listen(
            WaitlistConfirmationRequested::class,
            SendWaitlistConfirmationEmail::class
        );

        // Listen for successful email sending to update EmailLog entries
        Event::listen(
            MessageSent::class,
            UpdateEmailLogOnSent::class
        );

        Event::listen(
            MediaHasBeenAddedEvent::class,
            RecordMediaImageDimensions::class
        );

        Notification::observe(NotificationObserver::class);

        // Register custom notification channel for email verification
        $this->app->make('Illuminate\Notifications\ChannelManager')
            ->extend('notification_email', function () {
                return new NotificationEmailChannel;
            });

        // Update mail configuration on application boot if there's an active email configuration
        try {
            $emailConfigService = $this->app->make(EmailConfigurationService::class);
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

        // API rate limiters — relaxed in dev/test to avoid interfering with test suites
        RateLimiter::for('authenticated', function (Request $request) {
            $limit = app()->environment('local', 'testing', 'e2e') ? 300 : 300;

            return Limit::perMinute($limit)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('public-api', function (Request $request) {
            $limit = app()->environment('local', 'testing', 'e2e') ? 300 : 150;

            return Limit::perMinute($limit)->by($request->ip());
        });

        $routeActorKey = static function (Request $request): string {
            $route = $request->route()?->uri() ?? $request->path();
            $actor = $request->user()?->getAuthIdentifier() ?? $request->ip();

            return $route.'|'.$actor;
        };
        $relaxedWriteLimits = app()->environment('development', 'local', 'testing', 'e2e');
        foreach ([5, 6, 10, 15, 20, 60] as $productionLimit) {
            RateLimiter::for(
                "scoped-write-{$productionLimit}-per-minute",
                static fn (Request $request) => Limit::perMinute(
                    $relaxedWriteLimits ? 300 : $productionLimit
                )->by($routeActorKey($request))
            );
        }
        RateLimiter::for(
            'account-invitations-create',
            static fn (Request $request) => Limit::perHour(10)->by($routeActorKey($request))
        );
        RateLimiter::for(
            'account-invitations-revoke',
            static fn (Request $request) => Limit::perHour(20)->by($routeActorKey($request))
        );
        RateLimiter::for(
            'messages-create',
            static fn (Request $request) => Limit::perMinute(30)->by($routeActorKey($request))
        );

        RateLimiter::for('resource-invitation-consume', function (Request $request) {
            $limit = app()->environment('local', 'testing', 'e2e') ? 300 : 10;
            $token = (string) $request->route('token');
            $limits = [
                Limit::perMinute($limit)->by('consume-ip:'.$request->ip()),
                Limit::perMinute($limit)->by('consume-token:'.$token),
            ];

            if ($request->user() !== null) {
                $limits[] = Limit::perMinute($limit)->by('consume-user:'.$request->user()->id);
            }

            return $limits;
        });

        Pet::updated(function (Pet $pet): void {
            if (! $pet->wasChanged('status') || $pet->status !== PetStatus::DELETED) {
                return;
            }

            app(PetDeletionLifecycleService::class)->handle($pet);
        });
    }
}
