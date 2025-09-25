<?php

namespace App\Listeners;

use Illuminate\Support\Facades\Log;

class UpdateEmailLogOnFailed
{
    /**
     * Handle the event when an email fails to send.
     */
    public function handle(\Exception $exception): void
    {
        try {
            // This would be called from a mail failure event
            // For now, we'll handle this in the notification's failed method
            Log::error('Email sending failed', [
                'error' => $exception->getMessage(),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to handle email failure event', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}
