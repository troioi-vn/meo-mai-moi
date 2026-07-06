<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Enums\UnsubscribeScope;
use App\Mail\PlacementRequestResponseMail;
use App\Models\NotificationPreference;
use App\Models\User;
use App\Services\UnsubscribeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UnsubscribeTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected UnsubscribeService $unsubscribeService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->unsubscribeService = new UnsubscribeService;
    }

    public function test_unsubscribe_redirects_to_spa_settings_with_valid_parameters(): void
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;
        $token = $this->unsubscribeService->generateToken($this->user, $type);

        $response = $this->get('/unsubscribe?'.http_build_query([
            'user' => $this->user->id,
            'type' => $type->value,
            'token' => $token,
        ]));

        $response->assertRedirect();
        $target = $response->headers->get('Location');
        $this->assertStringContainsString('/settings/notifications?', $target);
        $this->assertStringContainsString('unsubscribe=1', $target);
        $this->assertStringContainsString('user='.$this->user->id, $target);
        $this->assertStringContainsString('type='.$type->value, $target);
        $this->assertStringContainsString('token='.$token, $target);
        $this->assertStringContainsString('channel=email', $target);
    }

    public function test_unsubscribe_redirects_even_when_serves_web_app_is_false(): void
    {
        config([
            'app.disable_admin_panel' => false,
            'app.admin_domain' => 'admin.example.com',
            'app.admin_panel_only' => false,
        ]);

        $type = NotificationType::PET_BIRTHDAY;
        $token = $this->unsubscribeService->generateToken($this->user, $type);

        $response = $this->get('/unsubscribe?'.http_build_query([
            'user' => $this->user->id,
            'type' => $type->value,
            'token' => $token,
        ]));

        $response->assertRedirect();
        $this->assertStringContainsString('/settings/notifications?', $response->headers->get('Location'));
    }

    public function test_unsubscribe_redirects_with_partial_parameters(): void
    {
        $response = $this->get('/unsubscribe?user=123');

        $response->assertRedirect();
        $target = $response->headers->get('Location');
        $this->assertStringContainsString('/settings/notifications?', $target);
        $this->assertStringContainsString('unsubscribe=1', $target);
        $this->assertStringContainsString('user=123', $target);
    }

    public function test_unsubscribe_api_with_valid_token_disables_all_email_notifications(): void
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;
        $token = $this->unsubscribeService->generateToken($this->user, $type);

        $this->assertTrue(NotificationPreference::isEmailEnabled($this->user, $type->value));

        $response = $this->postJson('/api/unsubscribe', [
            'user' => $this->user->id,
            'type' => $type->value,
            'token' => $token,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'You have successfully unsubscribed from all email notifications.',
        ]);

        foreach (NotificationType::cases() as $notificationType) {
            $this->assertFalse(
                NotificationPreference::isEmailEnabled($this->user, $notificationType->value),
                "Email should be disabled for {$notificationType->value}"
            );
        }
    }

    public function test_unsubscribe_api_with_scope_type_disables_single_type_only(): void
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;
        $otherType = NotificationType::PET_BIRTHDAY;
        $token = $this->unsubscribeService->generateToken($this->user, $type);

        $response = $this->postJson('/api/unsubscribe', [
            'user' => $this->user->id,
            'type' => $type->value,
            'token' => $token,
            'scope' => UnsubscribeScope::TYPE->value,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'You have been successfully unsubscribed from this notification type.',
        ]);

        $this->assertFalse(NotificationPreference::isEmailEnabled($this->user, $type->value));
        $this->assertTrue(NotificationPreference::isEmailEnabled($this->user, $otherType->value));
    }

    public function test_unsubscribe_api_accepts_plain_post_without_csrf_token(): void
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;
        $token = $this->unsubscribeService->generateToken($this->user, $type);

        $response = $this->post('/api/unsubscribe', [
            'user' => $this->user->id,
            'type' => $type->value,
            'token' => $token,
        ], [
            'Accept' => 'application/json',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'You have successfully unsubscribed from all email notifications.',
        ]);
    }

    public function test_unsubscribe_api_is_rate_limited(): void
    {
        $payload = [
            'user' => $this->user->id,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'token' => str_repeat('a', 64),
        ];

        for ($attempt = 0; $attempt < 6; $attempt++) {
            $this->postJson('/api/unsubscribe', $payload)->assertStatus(400);
        }

        $response = $this->postJson('/api/unsubscribe', $payload);

        $response->assertStatus(429);
        $response->assertHeader('Retry-After');
    }

    public function test_unsubscribe_api_with_invalid_token(): void
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;

        $response = $this->postJson('/api/unsubscribe', [
            'user' => $this->user->id,
            'type' => $type->value,
            'token' => str_repeat('a', 64),
        ]);

        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
            'message' => 'Invalid unsubscribe request. The link may be expired or invalid.',
        ]);

        $this->assertTrue(NotificationPreference::isEmailEnabled($this->user, $type->value));
    }

    public function test_unsubscribe_api_with_invalid_user(): void
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;
        $token = $this->unsubscribeService->generateToken($this->user, $type);

        $response = $this->postJson('/api/unsubscribe', [
            'user' => 99999,
            'type' => $type->value,
            'token' => $token,
        ]);

        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
        ]);
    }

    public function test_unsubscribe_api_with_invalid_type(): void
    {
        $token = $this->unsubscribeService->generateToken($this->user, NotificationType::PLACEMENT_REQUEST_RESPONSE);

        $response = $this->postJson('/api/unsubscribe', [
            'user' => $this->user->id,
            'type' => 'invalid-type',
            'token' => $token,
        ]);

        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
        ]);
    }

    public function test_unsubscribe_api_validation(): void
    {
        $response = $this->postJson('/api/unsubscribe', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['user', 'type', 'token']);
    }

    public function test_unsubscribe_api_rejects_malformed_token_format(): void
    {
        $response = $this->postJson('/api/unsubscribe', [
            'user' => $this->user->id,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'token' => 'not-a-valid-token',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['token']);
    }

    public function test_unsubscribe_preserves_in_app_notifications(): void
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;

        NotificationPreference::updatePreference($this->user, $type->value, true, true);

        $token = $this->unsubscribeService->generateToken($this->user, $type);

        $response = $this->postJson('/api/unsubscribe', [
            'user' => $this->user->id,
            'type' => $type->value,
            'token' => $token,
        ]);

        $response->assertStatus(200);

        $this->assertFalse(NotificationPreference::isEmailEnabled($this->user, $type->value));
        $this->assertTrue(NotificationPreference::isInAppEnabled($this->user, $type->value));
    }

    public function test_unsubscribe_works_with_existing_disabled_in_app(): void
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;

        NotificationPreference::updatePreference($this->user, $type->value, true, false);

        $token = $this->unsubscribeService->generateToken($this->user, $type);

        $response = $this->postJson('/api/unsubscribe', [
            'user' => $this->user->id,
            'type' => $type->value,
            'token' => $token,
        ]);

        $response->assertStatus(200);

        $this->assertFalse(NotificationPreference::isEmailEnabled($this->user, $type->value));
        $this->assertFalse(NotificationPreference::isInAppEnabled($this->user, $type->value));
    }

    public function test_unsubscribe_url_in_email_template_data(): void
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;
        $mail = new PlacementRequestResponseMail($this->user, $type, []);

        $content = $mail->content();
        $data = $content->with;

        $this->assertArrayHasKey('unsubscribeUrl', $data);
        $this->assertArrayHasKey('settingsNotificationsUrl', $data);
        $this->assertStringStartsWith(config('app.url').'/unsubscribe?', $data['unsubscribeUrl']);
        $this->assertStringContainsString('user='.$this->user->id, $data['unsubscribeUrl']);
        $this->assertStringContainsString('type='.$type->value, $data['unsubscribeUrl']);
        $this->assertStringContainsString('token=', $data['unsubscribeUrl']);
        $this->assertStringEndsWith('/settings/notifications', $data['settingsNotificationsUrl']);
    }
}
