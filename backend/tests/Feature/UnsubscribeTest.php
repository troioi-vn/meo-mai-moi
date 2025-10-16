<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
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

    public function test_unsubscribe_page_displays_with_valid_parameters()
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;
        $token = $this->unsubscribeService->generateToken($this->user, $type);

        $response = $this->get('/unsubscribe?'.http_build_query([
            'user' => $this->user->id,
            'type' => $type->value,
            'token' => $token,
        ]));

        $response->assertStatus(200);
        $response->assertViewIs('unsubscribe');
        $response->assertViewHas('isValid', true);
        $response->assertViewHas('notificationTypeLabel', $type->getLabel());
        $response->assertSee($type->getLabel());
        $response->assertSee('Yes, Unsubscribe Me');
    }

    public function test_unsubscribe_page_shows_error_with_invalid_parameters()
    {
        $response = $this->get('/unsubscribe?user=123&type=invalid&token=invalid');

        $response->assertStatus(200);
        $response->assertViewIs('unsubscribe');
        $response->assertViewHas('isValid', false);
        $response->assertSee('Invalid Request');
        $response->assertDontSee('Yes, Unsubscribe Me');
    }

    public function test_unsubscribe_page_shows_error_with_missing_parameters()
    {
        $response = $this->get('/unsubscribe');

        $response->assertStatus(200);
        $response->assertViewIs('unsubscribe');
        $response->assertViewHas('isValid', false);
        $response->assertSee('Invalid Request');
    }

    public function test_unsubscribe_api_with_valid_token()
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;
        $token = $this->unsubscribeService->generateToken($this->user, $type);

        // Verify email is initially enabled
        $this->assertTrue(NotificationPreference::isEmailEnabled($this->user, $type->value));

        $response = $this->postJson('/api/unsubscribe', [
            'user' => $this->user->id,
            'type' => $type->value,
            'token' => $token,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'You have been successfully unsubscribed from this notification type.',
        ]);

        // Verify email is now disabled
        $this->assertFalse(NotificationPreference::isEmailEnabled($this->user, $type->value));
    }

    public function test_unsubscribe_api_with_invalid_token()
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;

        $response = $this->postJson('/api/unsubscribe', [
            'user' => $this->user->id,
            'type' => $type->value,
            'token' => 'invalid-token',
        ]);

        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
            'message' => 'Invalid unsubscribe request. The link may be expired or invalid.',
        ]);

        // Verify email is still enabled
        $this->assertTrue(NotificationPreference::isEmailEnabled($this->user, $type->value));
    }

    public function test_unsubscribe_api_with_invalid_user()
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

    public function test_unsubscribe_api_with_invalid_type()
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

    public function test_unsubscribe_api_validation()
    {
        $response = $this->postJson('/api/unsubscribe', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['user', 'type', 'token']);
    }

    public function test_unsubscribe_preserves_in_app_notifications()
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;

        // Set initial preferences - both enabled
        NotificationPreference::updatePreference($this->user, $type->value, true, true);

        $token = $this->unsubscribeService->generateToken($this->user, $type);

        $response = $this->postJson('/api/unsubscribe', [
            'user' => $this->user->id,
            'type' => $type->value,
            'token' => $token,
        ]);

        $response->assertStatus(200);

        // Email should be disabled, in-app should remain enabled
        $this->assertFalse(NotificationPreference::isEmailEnabled($this->user, $type->value));
        $this->assertTrue(NotificationPreference::isInAppEnabled($this->user, $type->value));
    }

    public function test_unsubscribe_works_with_existing_disabled_in_app()
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;

        // Set initial preferences - email enabled, in-app disabled
        NotificationPreference::updatePreference($this->user, $type->value, true, false);

        $token = $this->unsubscribeService->generateToken($this->user, $type);

        $response = $this->postJson('/api/unsubscribe', [
            'user' => $this->user->id,
            'type' => $type->value,
            'token' => $token,
        ]);

        $response->assertStatus(200);

        // Both should now be disabled
        $this->assertFalse(NotificationPreference::isEmailEnabled($this->user, $type->value));
        $this->assertFalse(NotificationPreference::isInAppEnabled($this->user, $type->value));
    }

    public function test_unsubscribe_url_in_email_template_data()
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;
        $mail = new \App\Mail\PlacementRequestResponseMail($this->user, $type, []);

        $content = $mail->content();
        $data = $content->with;

        $this->assertArrayHasKey('unsubscribeUrl', $data);
        $this->assertStringStartsWith(config('app.url').'/unsubscribe?', $data['unsubscribeUrl']);
        $this->assertStringContainsString('user='.$this->user->id, $data['unsubscribeUrl']);
        $this->assertStringContainsString('type='.$type->value, $data['unsubscribeUrl']);
        $this->assertStringContainsString('token=', $data['unsubscribeUrl']);
    }
}
