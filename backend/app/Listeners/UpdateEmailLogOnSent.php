<?php

namespace App\Listeners;

use App\Models\EmailLog;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\Log;

class UpdateEmailLogOnSent
{
    /**
     * Handle the event when an email is successfully sent.
     */
    public function handle(MessageSent $event): void
    {
        try {
            // Find the corresponding EmailLog entry by recipient email and subject
            $recipients = collect($event->message->getTo())->keys();
            $subject = $event->message->getSubject();

            if ($recipients->isEmpty()) {
                return;
            }

            $recipientEmail = $recipients->first();

            // Find the most recent pending EmailLog entry for this recipient and subject
            $emailLog = EmailLog::where('recipient_email', $recipientEmail)
                ->where('subject', $subject)
                ->where('status', 'pending')
                ->latest()
                ->first();

            if ($emailLog) {
                $emailLog->markAsSent('Email sent successfully via Laravel Mail system');

                Log::info('EmailLog updated after successful email sending', [
                    'email_log_id' => $emailLog->id,
                    'recipient' => $recipientEmail,
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Failed to update EmailLog after email sent', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}
