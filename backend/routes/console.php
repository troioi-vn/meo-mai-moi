<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Custom commands are auto-discovered via PSR-4 in app/Console/Commands

// Schedule: vaccination reminders once daily at 09:00 server time
Schedule::command('reminders:vaccinations --days=3')
    ->dailyAt('09:00')
    ->withoutOverlapping();
