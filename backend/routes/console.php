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

// Schedule: habit reminders every minute so per-habit reminder times can be honored
Schedule::command('reminders:habits')
    ->everyMinute()
    ->withoutOverlapping();

// Schedule: chat digest emails every 15 minutes
Schedule::command('chat:send-digest-emails')
    ->everyFifteenMinutes()
    ->withoutOverlapping();

// Schedule: prune API request logs once daily (retention is configurable via settings)
Schedule::command('api-logs:prune')
    ->dailyAt('02:15')
    ->withoutOverlapping();

// Schedule: prune runtime error events once daily (retention is configurable via settings)
Schedule::command('errors:prune')
    ->dailyAt('02:30')
    ->withoutOverlapping();

// Schedule: batched email for public questions still waiting on an answer.
// The in-app bell already fired when each one arrived; this is the once-a-day
// nudge, kept out of per-event email so a busy listing cannot spam its rescue.
Schedule::command('placement-questions:send-digest-emails')
    ->dailyAt('10:00')
    ->withoutOverlapping();

// Schedule: drop asker email addresses nobody confirmed. They will never be
// mailed and the asker cannot manage them, so retaining them serves no one.
Schedule::command('placement-questions:prune-unconfirmed')
    ->dailyAt('03:00')
    ->withoutOverlapping();
