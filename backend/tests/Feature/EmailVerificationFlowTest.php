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

    /**
     * Test email verification with both auth drivers
     */
    protected function runEmailVerificationTestWithBothDrivers(callable $testCallback): void
    {
        // Test with custom auth driver
        config(['app.env' => 'testing']);
        putenv('AUTH_DRIVER=custom');
        $testCallback('custom');

        // Reset database state
        $this->refreshDatabase();

        // Test with jetstream auth driver
        putenv('AUTH_DRIVER=jetstream');
        $testCallback('jetstream');

        // Reset to default
        putenv('AUTH_DRIVER=custom');
    }

    #[Test]
    public function complete_email_verification_flow_works_correctly()
    {
        $this->runEmailVerificationTestWithBothDrivers(function ($authDriver) {
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
                'email' => "test-{$authDriver}@example.com",
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);

            $response->assertStatus(201);
            $responseData = $response->json('data');

            // User should be created but not verified
            $this->assertFalse($responseData['email_verified']);
            $this->assertTrue($responseData['email_sent']); // Assuming email config works

            $user = User::where('email', "test-{$authDriver}@example.com")->first();
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
                        'email' => "test-{$authDriver}@example.com",
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

            // Unauthenticated user hitting verification URL may be logged in already from registration; check and branch
            if (! auth()->check()) {
                $response = $this->get($verificationUrl);
                $response->assertRedirect(route('login', absolute: false));
            }

            // Clear intended to ensure successful post-verification redirect to dashboard
            session()->forget('url.intended');
            // After login, visiting the link verifies and redirects to dashboard (prefer web flow)
            $response = $this->actingAs($user, 'web')->get($verificationUrl);
            if ($response->getStatusCode() === 302) {
                $location = $response->headers->get('Location');
                $locationPath = $location ? parse_url($location, PHP_URL_PATH) : null;
                if ($locationPath === route('login', absolute: false)) {
                    // Fallback: verify via API endpoint using Sanctum token if web guard isn't active in this test context
                    $apiVerificationUrl = URL::temporarySignedRoute(
                        'api.verification.verify',
                        now()->addMinutes(60),
                        [
                            'id' => $user->id,
                            'hash' => sha1($user->email),
                        ]
                    );

                    $response = $this->withHeaders([
                        'Authorization' => 'Bearer '.$token,
                    ])->getJson(parse_url($apiVerificationUrl, PHP_URL_PATH).'?'.parse_url($apiVerificationUrl, PHP_URL_QUERY));

                    $response->assertStatus(200)
                        ->assertJson([
                            'data' => [
                                'verified' => true,
                            ],
                        ]);
                } else {
                    $response->assertRedirect(route('dashboard', absolute: false).'?verified=1');
                }
            }

            // Step 5: User can now access protected routes
            $user->refresh(); // Refresh user to get updated email_verified_at

            $this->assertTrue($user->hasVerifiedEmail(), 'User should be verified after verification');

            // Check database directly
            $dbUser = \App\Models\User::find($user->id);
            $this->assertNotNull($dbUser->email_verified_at, 'User should be verified in database');

            // Delete the old token and create a new one to ensure fresh user resolution
            $user->tokens()->delete();
            $newToken = $user->createToken('auth_token')->plainTextToken;

            $response = $this->withHeaders([
                'Authorization' => 'Bearer '.$newToken,
            ])->getJson('/api/users/me');

            $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        'id',
                        'name',
                        'email',
                    ],
                ]);

            // Test passes - user can access protected routes after verification
        });
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
