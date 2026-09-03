<?php

declare(strict_types=1);

namespace App\Console\DevCommands;

use Illuminate\Support\ServiceProvider;

class DevCommandServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // This command stays outside the auto-discovered directory. In
        // production, do not register it at all, so Artisan reports it as
        // unknown instead of exposing a command guarded only at runtime.
        if (! $this->app->isProduction()) {
            $this->commands([DemoReseedCommand::class]);
        }
    }
}
