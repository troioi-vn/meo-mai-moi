<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class EmailVerificationFlowTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function complete_email_verification_flow_works_correctly()
    {
        // Ensure email verification is required for this test run
        app(\App\Services\SettingsService::class)->configureEmailVerificationRequirement(true);
        Notification::fake();

        // Mock email configuration service to simulate working email
        $this->mock(\App\Services\EmailConfigurationService::class, function ($mock) {
            $mock->shouldReceive('isEmailEnabled')->andReturn(true);
        });

        // Step 1: User registers
        $response = $this->postJson('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password1secure',
            'password_confirmation' => 'Password1secure',
        ]);

        $response->assertStatus(201);
        $responseData = $response->json('data');

        // User should be created but not verified
        $this->assertFalse($responseData['email_verified']);
        $this->assertTrue($responseData['email_sent']); // Assuming email config works

        $user = User::where('email', 'test@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNull($user->email_verified_at);

        // Verification email should be sent
        Notification::assertSentTo($user, VerifyEmail::class);

        // Check that verification message was provided
        $this->assertStringContainsString('verification email', $responseData['message']);

        // Step 2: User tries to access verified-only route - should be blocked
        // Cookie-based auth: user is already authenticated via session
        $response = $this->getJson('/api/user');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Your email address is not verified.',
            ]);

        // Step 3: User can still access verification routes
        $response = $this->getJson('/api/email/verification-status');

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'verified' => false,
                    'email' => 'test@example.com',
                ],
            ]);

        // Step 4: User verifies email
        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => sha1($user->email),
            ]
        );

        // Visit the verification URL; expect redirect to SPA after verification
        $response = $this->get($verificationUrl);
        $response->assertRedirect(rtrim(config('app.frontend_url'), '/').'/?verified=1');

        // Step 5: User can now access protected routes
        $user->refresh(); // Refresh user to get updated email_verified_at

        $this->assertTrue($user->hasVerifiedEmail(), 'User should be verified after verification');

        // Check database directly
        $dbUser = \App\Models\User::find($user->id);
        $this->assertNotNull($dbUser->email_verified_at, 'User should be verified in database');

        // Explicitly authenticate as the user with Sanctum guard for API routes
        $this->actingAs($user, 'sanctum');

        // Now try to access verified-only routes
        $response = $this->getJson('/api/user');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'email',
                ],
            ]);

        // Test passes - user can access protected routes after verification
    }

    #[Test]
    public function user_can_resend_verification_email_when_unverified()
    {
        Notification::fake();

        // Mock email configuration service to simulate working email
        $this->mock(\App\Services\EmailConfigurationService::class, function ($mock) {
            $mock->shouldReceive('isEmailEnabled')->andReturn(true);
        });

        $user = User::factory()->create([
            'email_verified_at' => null,
        ]);

        $token = $user->createToken('test')->plainTextToken;

        // User should be able to resend verification email
        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->postJson('/api/email/verification-notification');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'message',
                    'email_sent',
                ],
            ]);

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

        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->postJson('/api/email/verification-notification');

        $response->assertStatus(400)
            ->assertJson([
                'message' => 'Email address already verified.',
            ]);
    }
}
