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
        Notification::fake();

        // Step 1: User registers
        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
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

        // Step 2: User tries to access protected route - should be blocked
        $token = $responseData['access_token'];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->getJson('/api/users/me');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Your email address is not verified. Please check your email for a verification link.',
                'email_verified' => false,
            ]);

        // Step 3: User can still access verification routes
        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->getJson('/api/email/verification-status');

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

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->get($verificationUrl);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'verified' => true,
                ],
            ]);

        // Step 5: User can now access protected routes
        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->getJson('/api/users/me');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'email',
                ],
            ]);

        // Step 6: Login should now show verified status
        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'email_verified' => true,
                ],
            ]);
    }

    #[Test]
    public function user_can_resend_verification_email_when_unverified()
    {
        Notification::fake();

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
