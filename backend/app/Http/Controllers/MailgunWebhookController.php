<?php

namespace App\Http\Controllers;

use App\Models\EmailLog;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MailgunWebhookController extends Controller
{
    public function handle(Request $request)
    {
        $payload = $request->all();

        if (! $this->isValidSignature($payload)) {
            return response()->json(['message' => 'Invalid signature'], 400);
        }

        $event = data_get($payload, 'event-data.event') ?? data_get($payload, 'event');
        $recipient = data_get($payload, 'event-data.recipient') ?? data_get($payload, 'recipient');
        $userVariables = data_get($payload, 'event-data.user-variables', []);
        $messageId = data_get($payload, 'event-data.message.headers.message-id');
        $severity = data_get($payload, 'event-data.severity');
        $reason = data_get($payload, 'event-data.delivery-status.message')
            ?? data_get($payload, 'event-data.delivery-status.description')
            ?? data_get($payload, 'event-data.reason')
            ?? 'Unknown';

        $emailLog = null;

        if (isset($userVariables['email_log_id'])) {
            $emailLog = EmailLog::find($userVariables['email_log_id']);
        }

        if (! $emailLog && $recipient) {
            $emailLog = EmailLog::where('recipient_email', $recipient)
                ->orderByDesc('created_at')
                ->first();
        }

        if (! $emailLog) {
            Log::warning('Mailgun webhook received but EmailLog not found', [
                'event' => $event,
                'recipient' => $recipient,
                'message_id' => $messageId,
            ]);

            return response()->json(['message' => 'EmailLog not found'], 202);
        }

        // Persist message-id/header info on first touch for later correlation
        $headers = $emailLog->headers ?? [];
        if ($messageId && (! isset($headers['message-id']))) {
            $headers['message-id'] = $messageId;
        }
        if (! empty($userVariables)) {
            $headers['mailgun_user_variables'] = $userVariables;
        }
        if (! empty($headers)) {
            $emailLog->update(['headers' => $headers]);
        }

        // Map Mailgun events to our statuses
        $eventNormalized = is_string($event) ? strtolower($event) : null;

        if (in_array($eventNormalized, ['accepted'])) {
            // Mailgun accepted the email for delivery
            $emailLog->markAsAccepted($reason);
        } elseif (in_array($eventNormalized, ['delivered'])) {
            // Email was successfully delivered
            $emailLog->markAsDelivered();
            $this->updateNotificationOnDelivered($emailLog);
        } elseif (in_array($eventNormalized, ['opened'])) {
            // Recipient opened the email
            $emailLog->markAsOpened();
        } elseif (in_array($eventNormalized, ['clicked'])) {
            // Recipient clicked a link
            $emailLog->markAsClicked();
        } elseif (in_array($eventNormalized, ['unsubscribed'])) {
            // Recipient unsubscribed
            $emailLog->markAsUnsubscribed();
        } elseif (in_array($eventNormalized, ['complained'])) {
            // Recipient marked as spam
            $emailLog->markAsComplained();
        } elseif (
            in_array($eventNormalized, ['failed', 'rejected', 'bounced']) ||
            ($eventNormalized === 'delivery-failure') ||
            ($severity === 'permanent')
        ) {
            // Permanent failure
            $emailLog->markAsPermanentFail($reason);
            $this->updateNotificationOnFailed($emailLog, $reason);
        } elseif ($eventNormalized === 'temporary_fail' || $severity === 'temporary') {
            // Temporary failure - keep as pending for retry
            Log::info('Temporary email delivery failure, keeping pending for retry', [
                'email_log_id' => $emailLog->id,
                'reason' => $reason,
            ]);
        } else {
            // Unknown event, just log it
            Log::info('Unknown Mailgun event received', [
                'email_log_id' => $emailLog->id,
                'event' => $eventNormalized,
            ]);
        }

        return response()->json(['message' => 'ok']);
    }

    private function isValidSignature(array $payload): bool
    {
        $signingKey = config('services.mailgun.webhook_signing_key');
        if (! $signingKey) {
            // If not configured, reject to avoid spoofing
            return false;
        }

        // Support both nested and flat formats
        $timestamp = data_get($payload, 'signature.timestamp') ?? data_get($payload, 'timestamp');
        $token = data_get($payload, 'signature.token') ?? data_get($payload, 'token');
        $signature = data_get($payload, 'signature.signature') ?? data_get($payload, 'signature');

        if (! $timestamp || ! $token || ! $signature) {
            return false;
        }

        // Optional: prevent replay attacks (tolerance 5 minutes)
        if (abs(time() - (int) $timestamp) > 300) {
            return false;
        }

        $computed = hash_hmac('sha256', $timestamp.$token, $signingKey);

        return hash_equals($computed, $signature);
    }

    private function updateNotificationOnDelivered(EmailLog $emailLog): void
    {
        if (! $emailLog->notification_id) {
            return;
        }
        $notification = Notification::find($emailLog->notification_id);
        if ($notification) {
            $notification->update([
                'delivered_at' => now(),
                'failed_at' => null,
                'failure_reason' => null,
            ]);
        }
    }

    private function updateNotificationOnFailed(EmailLog $emailLog, string $reason): void
    {
        if (! $emailLog->notification_id) {
            return;
        }
        $notification = Notification::find($emailLog->notification_id);
        if ($notification) {
            $notification->update([
                'failed_at' => now(),
                'failure_reason' => $reason,
                'delivered_at' => null,
            ]);
        }
    }
}
