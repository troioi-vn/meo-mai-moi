<?php

namespace App\Console\Commands;

use App\Enums\NotificationType;
use App\Models\VaccinationRecord;
use App\Services\NotificationService;
use App\Services\PetCapabilityService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendVaccinationReminders extends Command
{
    protected $signature = 'reminders:vaccinations {--days=3 : How many days ahead to look for due vaccinations}';

    protected $description = 'Send vaccination due reminders to pet owners and mark records to avoid duplicate reminders';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $today = Carbon::today();
        $cutoff = $today->copy()->addDays($days);

        $this->info("Scanning for vaccinations due between {$today->toDateString()} and {$cutoff->toDateString()}...");

        $query = VaccinationRecord::query()
            ->whereNotNull('due_at')
            ->whereDate('due_at', '<=', $cutoff)
            ->whereNull('reminder_sent_at')
            ->with([
                'pet' => function ($q) {
                    $q->with('user', 'petType');
                },
            ]);

        $count = 0;
        $service = app(NotificationService::class);

        $query->chunkById(100, function ($records) use (&$count, $service) {
            foreach ($records as $record) {
                $pet = $record->pet;
                if (! $pet || ! $pet->user) {
                    continue;
                }

                // Ensure capability allows vaccinations for this pet
                try {
                    PetCapabilityService::ensure($pet, 'vaccinations');
                } catch (\Throwable $e) {
                    continue;
                }

                $owner = $pet->user;

                $data = [
                    'message' => sprintf(
                        'Reminder: %s is due for %s on %s',
                        $pet->name,
                        $record->vaccine_name,
                        optional($record->due_at)->toDateString()
                    ),
                    'link' => url('/pets/'.$pet->id.'#vaccinations'),
                    'pet_id' => $pet->id,
                    'vaccination_record_id' => $record->id,
                    'vaccine_name' => $record->vaccine_name,
                    'due_at' => optional($record->due_at)?->toDateString(),
                    'notes' => $record->notes,
                ];

                // Respect user preferences via NotificationService
                $service->send($owner, NotificationType::VACCINATION_REMINDER->value, $data);

                // Mark reminder_sent_at to avoid duplicates (idempotent if run again today)
                $record->update(['reminder_sent_at' => now()]);

                $count++;
            }
        });

        $this->info("Sent {$count} vaccination reminder(s).");
        Log::info('Vaccination reminder job completed', ['count' => $count]);

        return Command::SUCCESS;
    }
}
