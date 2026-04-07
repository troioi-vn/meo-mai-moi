<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\NotificationType;
use App\Models\Habit;
use App\Services\HabitAccessService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendHabitReminders extends Command
{
    protected $signature = 'reminders:habits';

    protected $description = 'Send habit reminders for habits that are still empty for today';

    public function handle(HabitAccessService $accessService, NotificationService $notificationService): int
    {
        $now = Carbon::now();
        $time = $now->format('H:i');
        $weekday = (int) $now->dayOfWeek;
        $today = $now->toDateString();

        $count = 0;

        Habit::query()
            ->where('reminder_enabled', true)
            ->whereNull('archived_at')
            ->whereTime('reminder_time', $time)
            ->with(['pets.owners', 'creator'])
            ->chunkById(100, function ($habits) use ($accessService, $notificationService, $weekday, $today, &$count): void {
                /** @var Habit $habit */
                foreach ($habits as $habit) {
                    $weekdays = $habit->reminder_weekdays;
                    if (is_array($weekdays) && $weekdays !== [] && ! in_array($weekday, array_map('intval', $weekdays), true)) {
                        continue;
                    }

                    if ($habit->entries()->whereDate('entry_date', $today)->exists()) {
                        continue;
                    }

                    $recipients = $accessService->reminderRecipients($habit);
                    foreach ($recipients as $recipient) {
                        $notificationService->send($recipient, NotificationType::HABIT_REMINDER->value, [
                            'habit_id' => $habit->id,
                            'habit_name' => $habit->name,
                            'date' => $today,
                            'link' => '/habits/'.$habit->id.'?date='.$today,
                        ]);
                    }

                    $count++;
                }
            });

        Log::info('Habit reminder job completed', ['count' => $count, 'time' => $time, 'date' => $today]);
        $this->info("Sent {$count} habit reminder batch(es).");

        return Command::SUCCESS;
    }
}
