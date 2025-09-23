<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

use Illuminate\Support\Facades\Event;
use App\Events\HelperProfileStatusUpdated;
use App\Listeners\CreateHelperProfileNotification;
use App\Listeners\UpdateEmailLogOnSent;
use Illuminate\Mail\Events\MessageSent;

class AppServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array
     */
    protected $policies = [
        'App\Models\Cat' => 'App\Policies\CatPolicy',
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Services\EmailConfigurationService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(
            HelperProfileStatusUpdated::class,
            CreateHelperProfileNotification::class
        );

        // Listen for successful email sending to update EmailLog entries
        Event::listen(
            MessageSent::class,
            UpdateEmailLogOnSent::class
        );

        // Update mail configuration on application boot if there's an active email configuration
        try {
            $emailConfigService = $this->app->make(\App\Services\EmailConfigurationService::class);
            $emailConfigService->updateMailConfig();
        } catch (\Exception $e) {
            // Silently fail during boot to prevent application startup issues
            // The error will be logged by the service
        }
    }
}
