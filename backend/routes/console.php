<?php

declare(strict_types=1);

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function (): void {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Custom commands are auto-discovered via PSR-4 in app/Console/Commands

// Schedule: vaccination reminders once daily at 09:00 server time
// Sends reminders 3 days before vaccinations are due
Schedule::command('reminders:vaccinations')
    ->dailyAt('09:00')
    ->withoutOverlapping();

// Schedule: birthday reminders once daily at 08:00 server time
Schedule::command('reminders:birthdays')
    ->dailyAt('08:00')
    ->withoutOverlapping();

// Schedule: chat digest emails every 15 minutes
Schedule::command('chat:send-digest-emails')
    ->everyFifteenMinutes()
    ->withoutOverlapping();
