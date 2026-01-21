<?php

namespace Tests\Feature;

use App\Enums\EmailLogStatus;
use App\Models\EmailConfiguration;
use App\Models\EmailLog;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class MailgunWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Set up email configuration
        EmailConfiguration::create([
            'provider' => 'mailgun',
            'is_active' => true,
            'config' => [
                'domain' => 'mg.test.com',
                'api_key' => 'key-test123',
                'endpoint' => 'api.mailgun.net',
                'webhook_signing_key' => 'test-webhook-key',
                'from_address' => 'noreply@test.com',
                'from_name' => 'Test App',
            ],
        ]);

        Config::set('services.mailgun.webhook_signing_key', 'test-webhook-key');
    }

    public function test_webhook_marks_email_as_accepted(): void
    {
        $user = User::factory()->create(['email' => 'test@example.com']);
        $emailLog = EmailLog::create([
            'user_id' => $user->id,
            'recipient_email' => 'test@example.com',
            'subject' => 'Test Subject',
            'body' => 'Test body',
            'status' => 'pending',
        ]);

        $payload = $this->buildWebhookPayload('accepted', $emailLog);

        $response = $this->postJson('/api/webhooks/mailgun', $payload);

        $response->assertStatus(200);
        $emailLog->refresh();
        $this->assertEquals(EmailLogStatus::ACCEPTED, $emailLog->status);
        $this->assertNotNull($emailLog->sent_at);
    }

    public function test_webhook_marks_email_as_delivered(): void
    {
        $user = User::factory()->create(['email' => 'test@example.com']);
        $notification = Notification::factory()->create([
            'user_id' => $user->id,
            'type' => 'email_notification',
        ]);
        $emailLog = EmailLog::create([
            'user_id' => $user->id,
            'notification_id' => $notification->id,
            'recipient_email' => 'test@example.com',
            'subject' => 'Test Subject',
            'body' => 'Test body',
            'status' => 'accepted',
        ]);

        $payload = $this->buildWebhookPayload('delivered', $emailLog);

        $response = $this->postJson('/api/webhooks/mailgun', $payload);

        $response->assertStatus(200);
        $emailLog->refresh();
        $this->assertEquals(EmailLogStatus::DELIVERED, $emailLog->status);
        $this->assertNotNull($emailLog->delivered_at);

        $notification->refresh();
        $this->assertNotNull($notification->delivered_at);
    }

    public function test_webhook_tracks_email_opened(): void
    {
        $user = User::factory()->create(['email' => 'test@example.com']);
        $emailLog = EmailLog::create([
            'user_id' => $user->id,
            'recipient_email' => 'test@example.com',
            'subject' => 'Test Subject',
            'body' => 'Test body',
            'status' => 'delivered',
        ]);

        $payload = $this->buildWebhookPayload('opened', $emailLog);

        $response = $this->postJson('/api/webhooks/mailgun', $payload);

        $response->assertStatus(200);
        $emailLog->refresh();
        $this->assertNotNull($emailLog->opened_at);
    }

    public function test_webhook_tracks_email_clicked(): void
    {
        $user = User::factory()->create(['email' => 'test@example.com']);
        $emailLog = EmailLog::create([
            'user_id' => $user->id,
            'recipient_email' => 'test@example.com',
            'subject' => 'Test Subject',
            'body' => 'Test body',
            'status' => 'delivered',
        ]);

        $payload = $this->buildWebhookPayload('clicked', $emailLog);

        $response = $this->postJson('/api/webhooks/mailgun', $payload);

        $response->assertStatus(200);
        $emailLog->refresh();
        $this->assertNotNull($emailLog->clicked_at);
    }

    public function test_webhook_tracks_email_unsubscribed(): void
    {
        $user = User::factory()->create(['email' => 'test@example.com']);
        $emailLog = EmailLog::create([
            'user_id' => $user->id,
            'recipient_email' => 'test@example.com',
            'subject' => 'Test Subject',
            'body' => 'Test body',
            'status' => 'delivered',
        ]);

        $payload = $this->buildWebhookPayload('unsubscribed', $emailLog);

        $response = $this->postJson('/api/webhooks/mailgun', $payload);

        $response->assertStatus(200);
        $emailLog->refresh();
        $this->assertNotNull($emailLog->unsubscribed_at);
    }

    public function test_webhook_tracks_email_complained(): void
    {
        $user = User::factory()->create(['email' => 'test@example.com']);
        $emailLog = EmailLog::create([
            'user_id' => $user->id,
            'recipient_email' => 'test@example.com',
            'subject' => 'Test Subject',
            'body' => 'Test body',
            'status' => 'delivered',
        ]);

        $payload = $this->buildWebhookPayload('complained', $emailLog);

        $response = $this->postJson('/api/webhooks/mailgun', $payload);

        $response->assertStatus(200);
        $emailLog->refresh();
        $this->assertNotNull($emailLog->complained_at);
    }

    public function test_webhook_marks_email_as_permanent_fail(): void
    {
        $user = User::factory()->create(['email' => 'test@example.com']);
        $notification = Notification::factory()->create([
            'user_id' => $user->id,
            'type' => 'email_notification',
        ]);
        $emailLog = EmailLog::create([
            'user_id' => $user->id,
            'notification_id' => $notification->id,
            'recipient_email' => 'test@example.com',
            'subject' => 'Test Subject',
            'body' => 'Test body',
            'status' => 'accepted',
        ]);

        $payload = $this->buildWebhookPayload('failed', $emailLog, 'permanent');

        $response = $this->postJson('/api/webhooks/mailgun', $payload);

        $response->assertStatus(200);
        $emailLog->refresh();
        $this->assertEquals(EmailLogStatus::FAILED, $emailLog->status);
        $this->assertNotNull($emailLog->failed_at);
        $this->assertNotNull($emailLog->permanent_fail_at);

        $notification->refresh();
        $this->assertNotNull($notification->failed_at);
    }

    public function test_webhook_keeps_temporary_fail_as_pending(): void
    {
        $user = User::factory()->create(['email' => 'test@example.com']);
        $emailLog = EmailLog::create([
            'user_id' => $user->id,
            'recipient_email' => 'test@example.com',
            'subject' => 'Test Subject',
            'body' => 'Test body',
            'status' => 'pending',
        ]);

        $payload = $this->buildWebhookPayload('temporary_fail', $emailLog, 'temporary');

        $response = $this->postJson('/api/webhooks/mailgun', $payload);

        $response->assertStatus(200);
        $emailLog->refresh();
        // Status should remain pending for retry
        $this->assertEquals(EmailLogStatus::PENDING, $emailLog->status);
    }

    public function test_webhook_rejects_invalid_signature(): void
    {
        $user = User::factory()->create(['email' => 'test@example.com']);
        $emailLog = EmailLog::create([
            'user_id' => $user->id,
            'recipient_email' => 'test@example.com',
            'subject' => 'Test Subject',
            'body' => 'Test body',
            'status' => 'pending',
        ]);

        $payload = $this->buildWebhookPayload('delivered', $emailLog);
        $payload['signature']['signature'] = 'invalid-signature';

        $response = $this->postJson('/api/webhooks/mailgun', $payload);

        $response->assertStatus(400);
    }

    /**
     * Build a valid Mailgun webhook payload with proper signature.
     */
    private function buildWebhookPayload(string $event, EmailLog $emailLog, ?string $severity = null): array
    {
        $timestamp = time();
        $token = bin2hex(random_bytes(25));
        $signingKey = 'test-webhook-key';
        $signature = hash_hmac('sha256', $timestamp.$token, $signingKey);

        $payload = [
            'signature' => [
                'timestamp' => (string) $timestamp,
                'token' => $token,
                'signature' => $signature,
            ],
            'event-data' => [
                'event' => $event,
                'recipient' => $emailLog->recipient_email,
                'message' => [
                    'headers' => [
                        'message-id' => '<test-message-id@mailgun.net>',
                    ],
                ],
                'user-variables' => [
                    'email_log_id' => (string) $emailLog->id,
                ],
            ],
        ];

        if ($severity) {
            $payload['event-data']['severity'] = $severity;
        }

        if ($event === 'failed') {
            $payload['event-data']['delivery-status'] = [
                'message' => 'Test failure reason',
            ];
        }

        return $payload;
    }
}
