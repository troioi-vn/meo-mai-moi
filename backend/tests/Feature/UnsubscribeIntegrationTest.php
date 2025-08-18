<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\NotificationPreference;
use App\Services\NotificationService;
use App\Services\UnsubscribeService;
use App\Enums\NotificationType;
use App\Mail\PlacementRequestResponseMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;

class UnsubscribeIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected NotificationService $notificationService;
    protected UnsubscribeService $unsubscribeService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->notificationService = new NotificationService();
        $this->unsubscribeService = new UnsubscribeService();
    }

    public function test_complete_unsubscribe_flow()
    {
        Mail::fake();
        Queue::fake();
        
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;
        
        // Step 1: Send a notification (should include unsubscribe link)
        $this->notificationService->send($this->user, $type->value, []);
        
        // Verify email was queued
        Queue::assertPushed(\App\Jobs\SendNotificationEmail::class);
        
        // Step 2: Generate unsubscribe URL (simulating email template)
        $unsubscribeUrl = $this->unsubscribeService->generateUnsubscribeUrl($this->user, $type);
        
        // Step 3: User visits unsubscribe page
        $parsedUrl = parse_url($unsubscribeUrl);
        parse_str($parsedUrl['query'], $params);
        
        $response = $this->get('/unsubscribe?' . $parsedUrl['query']);
        $response->assertStatus(200);
        $response->assertSee('Yes, Unsubscribe Me');
        
        // Step 4: User confirms unsubscribe
        $response = $this->postJson('/api/unsubscribe', $params);
        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        
        // Step 5: Verify email notifications are disabled
        $this->assertFalse(NotificationPreference::isEmailEnabled($this->user, $type->value));
        $this->assertTrue(NotificationPreference::isInAppEnabled($this->user, $type->value));
        
        // Step 6: Send another notification - should only create in-app
        Queue::fake(); // Reset queue
        $this->notificationService->send($this->user, $type->value, []);
        
        // Should not queue email job
        Queue::assertNotPushed(\App\Jobs\SendNotificationEmail::class);
        
        // Should still create in-app notification
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->user->id,
            'type' => $type->value,
        ]);
    }

    public function test_unsubscribe_url_in_actual_email()
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;
        $mail = new PlacementRequestResponseMail($this->user, $type, []);
        
        $content = $mail->content();
        $templateData = $content->with;
        
        // Verify unsubscribe URL is present and valid
        $this->assertArrayHasKey('unsubscribeUrl', $templateData);
        
        $unsubscribeUrl = $templateData['unsubscribeUrl'];
        $parsedUrl = parse_url($unsubscribeUrl);
        parse_str($parsedUrl['query'], $params);
        
        // Verify URL parameters
        $this->assertEquals($this->user->id, $params['user']);
        $this->assertEquals($type->value, $params['type']);
        $this->assertNotEmpty($params['token']);
        
        // Verify token is valid
        $this->assertTrue(
            $this->unsubscribeService->verifyToken(
                $this->user, 
                $type, 
                $params['token']
            )
        );
    }

    public function test_unsubscribe_only_affects_specific_notification_type()
    {
        $type1 = NotificationType::PLACEMENT_REQUEST_RESPONSE;
        $type2 = NotificationType::PLACEMENT_REQUEST_ACCEPTED;
        
        // Generate token for type1 and unsubscribe
        $token = $this->unsubscribeService->generateToken($this->user, $type1);
        
        $response = $this->postJson('/api/unsubscribe', [
            'user' => $this->user->id,
            'type' => $type1->value,
            'token' => $token,
        ]);
        
        $response->assertStatus(200);
        
        // Verify only type1 is disabled
        $this->assertFalse(NotificationPreference::isEmailEnabled($this->user, $type1->value));
        $this->assertTrue(NotificationPreference::isEmailEnabled($this->user, $type2->value));
    }

    public function test_malicious_token_manipulation_fails()
    {
        $type = NotificationType::PLACEMENT_REQUEST_RESPONSE;
        $validToken = $this->unsubscribeService->generateToken($this->user, $type);
        
        // Try to use valid token for different user
        $otherUser = User::factory()->create();
        
        $response = $this->postJson('/api/unsubscribe', [
            'user' => $otherUser->id,
            'type' => $type->value,
            'token' => $validToken,
        ]);
        
        $response->assertStatus(400);
        
        // Verify other user's preferences weren't affected
        $this->assertTrue(NotificationPreference::isEmailEnabled($otherUser, $type->value));
    }
}