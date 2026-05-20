<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\NotificationType;
use App\Models\Notification;
use App\Models\Pet;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendBirthdayReminders extends Command
{
    protected $signature = 'reminders:birthdays';

    protected $description = 'Send birthday reminders to pet owners on pet birthdays';

    public function handle(): int
    {
        $today = Carbon::today();
        $month = $today->month;
        $day = $today->day;

        $this->info("Scanning for pet birthdays today ({$today->toDateString()})...");

        // Find all pets with birthdays today
        // Note: We match on month and day only since we may not know the exact year for some pets
        $query = Pet::query()
            ->whereNotNull('birthday')
            ->with(['owners', 'editors', 'petType'])
            ->where(function ($q) use ($month, $day): void {
                // For pets with exact birthday (precision = day)
                $q->whereRaw('EXTRACT(MONTH FROM birthday) = ? AND EXTRACT(DAY FROM birthday) = ?', [$month, $day]);
            });

        $count = 0;
        $service = app(NotificationService::class);

        $query->chunkById(100, function ($pets) use (&$count, $service, $today): void {
            foreach ($pets as $pet) {
                // Get current owners and editors of the pet
                $recipients = $pet->owners
                    ->merge($pet->editors)
                    ->unique('id')
                    ->values();

                if ($recipients->isEmpty()) {
                    continue;
                }

                // Calculate age
                $age = $pet->getAge();

                // Send birthday reminder to all current owners and editors
                foreach ($recipients as $recipient) {
                    if (! $recipient instanceof User) {
                        continue;
                    }

                    if ($this->alreadySentBirthdayNotification($recipient, $pet->id, $today)) {
                        continue;
                    }

                    $data = [
                        'message' => sprintf(
                            '🎂 Happy Birthday %s! Today %s turns %s',
                            $pet->name,
                            $pet->name,
                            $age
                        ),
                        'link' => url('/pets/'.$pet->id),
                        'pet_id' => $pet->id,
                        'pet_name' => $pet->name,
                        'birthday' => optional($pet->birthday)->toDateString(),
                        'age' => $age,
                    ];

                    // Respect user preferences via NotificationService
                    $service->send($recipient, NotificationType::PET_BIRTHDAY->value, $data);
                }

                $count++;
            }
        });

        $this->info("Sent {$count} birthday reminder(s).");
        Log::info('Birthday reminder job completed', ['count' => $count]);

        return Command::SUCCESS;
    }

    private function alreadySentBirthdayNotification(User $recipient, int $petId, Carbon $today): bool
    {
        return Notification::query()
            ->where('user_id', $recipient->id)
            ->where('type', NotificationType::PET_BIRTHDAY->value)
            ->whereDate('created_at', $today->toDateString())
            ->where('data->pet_id', $petId)
            ->where(function ($query): void {
                $query->whereNull('data->channel')
                    ->orWhere('data->channel', 'like', 'in_app%');
            })
            ->exists();
    }
}
