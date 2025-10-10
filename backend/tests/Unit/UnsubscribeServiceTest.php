<?php

namespace Tests\Unit;

use App\Enums\NotificationType;
use App\Models\NotificationPreference;
use App\Models\User;
use App\Services\UnsubscribeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UnsubscribeServiceTest extends TestCase
{
    use RefreshDatabase;

    protected UnsubscribeService $service;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new UnsubscribeService();
        $this->user = User::factory()->create();
    }

    public function test_generates_consistent_token()
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;

        $token1 = $this->service->generateToken($this->user, $type);
        $token2 = $this->service->generateToken($this->user, $type);

        $this->assertEquals($token1, $token2);
        $this->assertIsString($token1);
        $this->assertEquals(64, strlen($token1)); // SHA256 hex length
    }

    public function test_generates_different_tokens_for_different_users()
    {
        $user2 = User::factory()->create();
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;

        $token1 = $this->service->generateToken($this->user, $type);
        $token2 = $this->service->generateToken($user2, $type);

        $this->assertNotEquals($token1, $token2);
    }

    public function test_generates_different_tokens_for_different_types()
    {
        $token1 = $this->service->generateToken($this->user, NotificationType::PLACEMENT_REQUEST_RESPONSE);
        $token2 = $this->service->generateToken($this->user, NotificationType::PLACEMENT_REQUEST_ACCEPTED);

        $this->assertNotEquals($token1, $token2);
    }

    public function test_verifies_valid_token()
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;
        $token = $this->service->generateToken($this->user, $type);

        $this->assertTrue($this->service->verifyToken($this->user, $type, $token));
    }

    public function test_rejects_invalid_token()
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;

        $this->assertFalse($this->service->verifyToken($this->user, $type, 'invalid-token'));
    }

    public function test_generates_unsubscribe_url()
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;
        $url = $this->service->generateUnsubscribeUrl($this->user, $type);

        $this->assertStringStartsWith(config('app.url').'/unsubscribe?', $url);
        $this->assertStringContainsString('user='.$this->user->id, $url);
        $this->assertStringContainsString('type='.$type->value, $url);
        $this->assertStringContainsString('token=', $url);
    }

    public function test_unsubscribe_with_valid_token()
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;
        $token = $this->service->generateToken($this->user, $type);

        // Initially email should be enabled
        $this->assertTrue(NotificationPreference::isEmailEnabled($this->user, $type->value));

        $result = $this->service->unsubscribe($this->user->id, $type->value, $token);

        $this->assertTrue($result);
        $this->assertFalse(NotificationPreference::isEmailEnabled($this->user, $type->value));
        // In-app should still be enabled
        $this->assertTrue(NotificationPreference::isInAppEnabled($this->user, $type->value));
    }

    public function test_unsubscribe_with_invalid_user()
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;
        $token = $this->service->generateToken($this->user, $type);

        $result = $this->service->unsubscribe(99999, $type->value, $token);

        $this->assertFalse($result);
    }

    public function test_unsubscribe_with_invalid_type()
    {
        $token = $this->service->generateToken($this->user, NotificationType::PLACEMENT_REQUEST_RESPONSE);

        $result = $this->service->unsubscribe($this->user->id, 'invalid-type', $token);

        $this->assertFalse($result);
    }

    public function test_unsubscribe_with_invalid_token()
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;

        $result = $this->service->unsubscribe($this->user->id, $type->value, 'invalid-token');

        $this->assertFalse($result);
    }

    public function test_unsubscribe_preserves_existing_preferences()
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;

        // Set initial preferences
        NotificationPreference::updatePreference($this->user, $type->value, true, false);

        $token = $this->service->generateToken($this->user, $type);
        $result = $this->service->unsubscribe($this->user->id, $type->value, $token);

        $this->assertTrue($result);
        $this->assertFalse(NotificationPreference::isEmailEnabled($this->user, $type->value));
        $this->assertFalse(NotificationPreference::isInAppEnabled($this->user, $type->value));
    }
}
