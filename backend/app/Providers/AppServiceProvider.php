<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

use Illuminate\Support\Facades\Event;
use App\Events\HelperProfileStatusUpdated;
use App\Listeners\CreateHelperProfileNotification;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
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
    }
}
