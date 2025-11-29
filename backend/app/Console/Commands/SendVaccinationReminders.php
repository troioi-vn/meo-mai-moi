<?php

namespace App\Console\Commands;

use App\Enums\NotificationType;
use App\Models\Pet;
use App\Models\User;
use App\Models\VaccinationRecord;
use App\Services\NotificationService;
use App\Services\PetCapabilityService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class SendVaccinationReminders extends Command
{
    /**
     * How many days before the due date to send reminders.
     */
    private const REMINDER_DAYS_BEFORE = 3;

    protected $signature = 'reminders:vaccinations';

    protected $description = 'Send vaccination due reminders to pet owners (grouped by pet) '.self::REMINDER_DAYS_BEFORE.' days before due date';

    public function handle(): int
    {
        $today = Carbon::today();
        // Look for vaccinations due in exactly REMINDER_DAYS_BEFORE days
        // This ensures we send reminders ahead of time, not on/after the due date
        $targetDate = $today->copy()->addDays(self::REMINDER_DAYS_BEFORE);

        $this->info("Scanning for vaccinations due on {$targetDate->toDateString()} (".self::REMINDER_DAYS_BEFORE." days from now)...");

        // Get all active vaccination records due on target date that haven't had reminders sent
        $records = VaccinationRecord::query()
            ->active() // Only active (non-completed) records
            ->whereNotNull('due_at')
            ->whereDate('due_at', $targetDate)
            ->whereNull('reminder_sent_at')
            ->with([
                'pet' => fn ($q) => $q->with('user', 'petType'),
            ])
            ->get();

        // Group records by pet_id
        $groupedByPet = $records->groupBy('pet_id');

        $notificationCount = 0;
        $recordCount = 0;
        $service = app(NotificationService::class);

        foreach ($groupedByPet as $petId => $petRecords) {
            $result = $this->sendGroupedReminder($service, $petRecords, $targetDate);
            if ($result) {
                $notificationCount++;
                $recordCount += $petRecords->count();
            }
        }

        $this->info("Sent {$notificationCount} notification(s) for {$recordCount} vaccination record(s).");
        Log::info('Vaccination reminder job completed', [
            'notifications_sent' => $notificationCount,
            'records_processed' => $recordCount,
        ]);

        return Command::SUCCESS;
    }

    /**
     * Send a single grouped reminder for all vaccinations of a pet.
     */
    private function sendGroupedReminder(NotificationService $service, Collection $records, Carbon $dueDate): bool
    {
        $firstRecord = $records->first();
        $pet = $firstRecord->pet;

        if (! $pet instanceof Pet) {
            return false;
        }

        if (! $pet->user) {
            return false;
        }

        // Ensure capability allows vaccinations for this pet
        try {
            PetCapabilityService::ensure($pet, 'vaccinations');
        } catch (\Throwable $e) {
            return false;
        }

        $owner = $pet->user;
        if (! $owner instanceof User) {
            return false;
        }

        // Build vaccine list for message
        $vaccineNames = $records->pluck('vaccine_name')->unique()->values()->toArray();
        $vaccineList = $this->formatVaccineList($vaccineNames);

        // Build message based on count
        $message = $records->count() === 1
            ? sprintf('%s is due for %s on %s', $pet->name, $vaccineNames[0], $dueDate->toDateString())
            : sprintf('%s is due for %s on %s', $pet->name, $vaccineList, $dueDate->toDateString());

        $data = [
            'message' => $message,
            'link' => '/pets/'.$pet->id,
            'pet_id' => $pet->id,
            'pet_name' => $pet->name,
            'vaccination_record_ids' => $records->pluck('id')->toArray(),
            'vaccine_names' => $vaccineNames,
            'due_at' => $dueDate->toDateString(),
            'days_until_due' => self::REMINDER_DAYS_BEFORE,
        ];

        // Send notification (respects user preferences for email/in-app)
        $service->send($owner, NotificationType::VACCINATION_REMINDER->value, $data);

        // Mark all records as reminder sent
        $now = now();
        foreach ($records as $record) {
            $record->update(['reminder_sent_at' => $now]);
        }

        return true;
    }

    /**
     * Format a list of vaccine names for display.
     */
    private function formatVaccineList(array $names): string
    {
        if (count($names) === 1) {
            return $names[0];
        }

        if (count($names) === 2) {
            return $names[0].' and '.$names[1];
        }

        $last = array_pop($names);

        return implode(', ', $names).', and '.$last;
    }
}
