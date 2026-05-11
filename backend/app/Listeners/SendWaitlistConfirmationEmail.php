<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\WaitlistConfirmationRequested;
use App\Notifications\WaitlistConfirmation;
use Illuminate\Support\Facades\Log;

class SendWaitlistConfirmationEmail
{
    public function handle(WaitlistConfirmationRequested $event): void
    {
        try {
            WaitlistConfirmation::sendToEmail(
                $event->email,
                $event->waitlistEntry,
                $event->locale,
            );
        } catch (\Exception $exception) {
            Log::warning('Failed to send waitlist confirmation email', [
                'waitlist_entry_id' => $event->waitlistEntry->id,
                'email' => $event->email,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
