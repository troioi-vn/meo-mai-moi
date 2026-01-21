<?php

declare(strict_types=1);

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
                // Persist select headers for later correlation (e.g., Message-ID)
                try {
                    $headers = $event->message->getHeaders();
                    $messageId = $headers->get('Message-ID')?->getBodyAsString();
                    $xMailgunVars = $headers->get('X-Mailgun-Variables')?->getBodyAsString();
                    $existing = $emailLog->headers ?? [];
                    if ($messageId) {
                        $existing['message-id'] = $messageId;
                    }
                    if ($xMailgunVars) {
                        // Store as decoded JSON if possible
                        $decoded = json_decode($xMailgunVars, true);
                        $existing['mailgun_user_variables'] = is_array($decoded) ? $decoded : $xMailgunVars;
                    }
                    if (! empty($existing)) {
                        $emailLog->update(['headers' => $existing]);
                    }
                } catch (\Throwable $e) {
                    // Non-fatal: capture minimal context for troubleshooting
                    Log::debug('Non-fatal error persisting email headers', [
                        'error' => $e->getMessage(),
                    ]);
                }

                $emailLog->markAsAccepted('Email accepted by Laravel Mail system');

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
