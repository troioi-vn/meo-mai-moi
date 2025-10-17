<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Tests\Traits\CreatesUsers;

class EmailVerificationTest extends TestCase
{
    use CreatesUsers;
    use RefreshDatabase;

    #[Test]
    public function registration_sends_email_verification_notification()
    {
        Notification::fake();

        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'access_token',
                    'token_type',
                    'email_verified',
                    'email_sent',
                    'requires_verification',
                    'message',
                ],
            ])
            ->assertJson([
                'data' => [
                    'email_verified' => false,
                    'requires_verification' => true,
                ],
            ]);

        $user = User::where('email', 'test@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNull($user->email_verified_at);

        // Check that verification notification was sent
        Notification::assertSentTo($user, VerifyEmail::class);

        // Check that the message indicates email was sent (or attempted)
        $responseData = $response->json('data');
        $this->assertStringContainsString('verification email', $responseData['message']);
    }

    #[Test]
    public function user_can_verify_email_with_valid_link()
    {
        $user = User::factory()->create([
            'email_verified_at' => null,
        ]);

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => sha1($user->email),
            ]
        );

        $response = $this->actingAs($user)->get($verificationUrl);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'message' => 'Email verified successfully.',
                    'verified' => true,
                ],
            ]);

        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    #[Test]
    public function user_cannot_verify_email_with_invalid_hash()
    {
        $user = User::factory()->create([
            'email_verified_at' => null,
        ]);

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => 'invalid-hash',
            ]
        );

        $response = $this->actingAs($user)->get($verificationUrl);

        $response->assertStatus(403);
        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    #[Test]
    public function already_verified_user_gets_appropriate_message()
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => sha1($user->email),
            ]
        );

        $response = $this->actingAs($user)->get($verificationUrl);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'message' => 'Email address already verified.',
                    'verified' => true,
                ],
            ]);
    }

    #[Test]
    public function user_can_resend_verification_email()
    {
        Notification::fake();

        $user = User::factory()->create([
            'email_verified_at' => null,
        ]);

        $response = $this->actingAs($user)->postJson('/api/email/verification-notification');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'message',
                    'email_sent',
                ],
            ]);

        // Check that verification notification was sent
        Notification::assertSentTo($user, VerifyEmail::class);

        $responseData = $response->json('data');
        $this->assertStringContainsString('verification email', $responseData['message']);
    }

    #[Test]
    public function verified_user_cannot_resend_verification_email()
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $response = $this->actingAs($user)->postJson('/api/email/verification-notification');

        $response->assertStatus(400)
            ->assertJson([
                'message' => 'Email address already verified.',
            ]);
    }

    #[Test]
    public function user_can_check_verification_status()
    {
        $unverifiedUser = User::factory()->create([
            'email_verified_at' => null,
        ]);

        $response = $this->actingAs($unverifiedUser)->getJson('/api/email/verification-status');

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'verified' => false,
                    'email' => $unverifiedUser->email,
                ],
            ]);

        $verifiedUser = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $response = $this->actingAs($verifiedUser)->getJson('/api/email/verification-status');

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'verified' => true,
                    'email' => $verifiedUser->email,
                ],
            ]);
    }

    #[Test]
    public function unverified_user_cannot_access_protected_routes()
    {
        $user = User::factory()->create([
            'email_verified_at' => null,
        ]);

        // Test with an actual protected route that requires verification
        $response = $this->actingAs($user)->getJson('/api/users/me');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Your email address is not verified. Please check your email for a verification link.',
                'email_verified' => false,
            ]);
    }

    #[Test]
    public function verified_user_can_access_protected_routes()
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        // Test with an actual protected route that requires verification
        $response = $this->actingAs($user)->getJson('/api/users/me');

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $user->id,
                    'email' => $user->email,
                ],
            ]);
    }

    #[Test]
    public function registration_handles_mail_server_configuration_gracefully()
    {
        // Mock the EmailConfigurationService to simulate no mail configuration
        $this->mock(\App\Services\EmailConfigurationService::class, function ($mock) {
            $mock->shouldReceive('isEmailEnabled')->andReturn(false);
        });

        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'access_token',
                    'token_type',
                    'email_verified',
                    'email_sent',
                    'requires_verification',
                    'message',
                ],
            ])
            ->assertJson([
                'data' => [
                    'email_verified' => false,
                    'email_sent' => false,
                    'requires_verification' => true,
                ],
            ]);

        // Check that the message indicates mail server issue
        $responseData = $response->json('data');
        $this->assertStringContainsString('unable to send verification email', $responseData['message']);
    }

    #[Test]
    public function resend_verification_handles_mail_server_configuration_gracefully()
    {
        $user = User::factory()->create([
            'email_verified_at' => null,
        ]);

        // Mock the EmailConfigurationService to simulate no mail configuration
        $this->mock(\App\Services\EmailConfigurationService::class, function ($mock) {
            $mock->shouldReceive('isEmailEnabled')->andReturn(false);
        });

        $response = $this->actingAs($user)->postJson('/api/email/verification-notification');

        $response->assertStatus(503)
            ->assertJson([
                'message' => 'We are unable to send verification email at the moment. But hopefully admins are working on it and you will receive it soon.',
            ]);
    }

    #[Test]
    public function unverified_user_cannot_access_main_application_routes()
    {
        $user = User::factory()->create([
            'email_verified_at' => null,
        ]);

        // Test accessing user profile (should require verification)
        $response = $this->actingAs($user)->getJson('/api/users/me');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Your email address is not verified. Please check your email for a verification link.',
                'email_verified' => false,
            ]);

        // Test accessing pets (should require verification)
        $response = $this->actingAs($user)->getJson('/api/my-pets');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Your email address is not verified. Please check your email for a verification link.',
                'email_verified' => false,
            ]);
    }

    #[Test]
    public function unverified_user_can_access_verification_and_notification_routes()
    {
        $user = User::factory()->create([
            'email_verified_at' => null,
        ]);

        // Should be able to check verification status
        $response = $this->actingAs($user)->getJson('/api/email/verification-status');
        $response->assertStatus(200);

        // Should be able to access notifications
        $response = $this->actingAs($user)->getJson('/api/notifications');
        $response->assertStatus(200);
    }

    #[Test]
    public function verified_user_can_access_all_routes()
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        // Should be able to access protected routes
        $response = $this->actingAs($user)->getJson('/api/users/me');
        $response->assertStatus(200);

        $response = $this->actingAs($user)->getJson('/api/my-pets');
        $response->assertStatus(200);

        // Should also be able to access verification routes
        $response = $this->actingAs($user)->getJson('/api/email/verification-status');
        $response->assertStatus(200);
    }
}
