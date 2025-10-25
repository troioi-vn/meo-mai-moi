<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class JetstreamEmailFlowTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test email flows with both auth drivers
     */
    protected function runEmailFlowTestWithBothDrivers(callable $testCallback): void
    {
        // Test with custom auth driver
        config(['app.env' => 'testing']);
        putenv('AUTH_DRIVER=custom');
        $customResult = $testCallback('custom');

        // Reset database state
        $this->refreshDatabase();

        // Test with jetstream auth driver
        putenv('AUTH_DRIVER=jetstream');
        $jetstreamResult = $testCallback('jetstream');
        
        // Reset to default
        putenv('AUTH_DRIVER=custom');

        // Compare results to ensure they're identical
        $this->assertEquals($customResult, $jetstreamResult, 'Email flow responses differ between auth drivers');
    }

    #[Test]
    public function email_verification_url_generation_is_consistent()
    {
        $this->runEmailFlowTestWithBothDrivers(function ($authDriver) {
            // Create unverified user
            $user = User::factory()->create([
                'email' => "verify-{$authDriver}@example.com",
                'email_verified_at' => null,
            ]);

            // Generate verification URLs for both web and API routes
            $webUrl = URL::temporarySignedRoute(
                'verification.verify',
                now()->addMinutes(60),
                [
                    'id' => $user->id,
                    'hash' => sha1($user->email),
                ]
            );

            $apiUrl = URL::temporarySignedRoute(
                'api.verification.verify',
                now()->addMinutes(60),
                [
                    'id' => $user->id,
                    'hash' => sha1($user->email),
                ]
            );

            // Verify URLs are properly signed and contain correct parameters
            $this->assertStringContainsString('signature=', $webUrl);
            $this->assertStringContainsString('signature=', $apiUrl);
            $this->assertStringContainsString('expires=', $webUrl);
            $this->assertStringContainsString('expires=', $apiUrl);
            $this->assertStringContainsString("/email/verify/{$user->id}/", $webUrl);
            $this->assertStringContainsString("/email/verify/{$user->id}/", $apiUrl);

            return [
                'web_url_signed' => str_contains($webUrl, 'signature='),
                'api_url_signed' => str_contains($apiUrl, 'signature='),
                'urls_contain_user_id' => str_contains($webUrl, "/email/verify/{$user->id}/") && str_contains($apiUrl, "/email/verify/{$user->id}/"),
            ];
        });
    }

    #[Test]
    public function api_email_verification_works_consistently()
    {
        $this->runEmailFlowTestWithBothDrivers(function ($authDriver) {
            // Create unverified user
            $user = User::factory()->create([
                'email' => "api-verify-{$authDriver}@example.com",
                'email_verified_at' => null,
            ]);

            // Generate API verification URL
            $verificationUrl = URL::temporarySignedRoute(
                'api.verification.verify',
                now()->addMinutes(60),
                [
                    'id' => $user->id,
                    'hash' => sha1($user->email),
                ]
            );

            // Authenticate via Sanctum and call API verification (should return JSON)
            $token = $user->createToken('verify')->plainTextToken;
            $response = $this->withHeaders([
                'Authorization' => 'Bearer '.$token,
                'Accept' => 'application/json',
            ])->get($verificationUrl);
            $response->assertStatus(200);
            $data = $response->json('data');
            $this->assertTrue($data['verified'] ?? false);

            // Verify user is now verified
            $user->refresh();
            $this->assertNotNull($user->email_verified_at);

            return [
                'status' => $response->status(),
                'verified_response' => $data['verified'] ?? null,
                'user_verified' => $user->hasVerifiedEmail(),
            ];
        });
    }

    #[Test]
    public function invalid_verification_links_handled_consistently()
    {
        $this->runEmailFlowTestWithBothDrivers(function ($authDriver) {
            // Create user
            $user = User::factory()->create([
                'email' => "invalid-{$authDriver}@example.com",
                'email_verified_at' => null,
            ]);

            // Test invalid verification link using API route (wrong hash)
            $invalidApiUrl = URL::temporarySignedRoute(
                'api.verification.verify',
                now()->addMinutes(60),
                [
                    'id' => $user->id,
                    'hash' => 'invalid-hash',
                ]
            );

            // Test API verification with invalid hash over Sanctum
            $token = $user->createToken('verify')->plainTextToken;
            $response = $this->withHeaders([
                'Authorization' => 'Bearer '.$token,
                'Accept' => 'application/json',
            ])->get($invalidApiUrl);
            
            // Should return 403 error
            $response->assertStatus(403);
            
            // Check the response has an error message
            $response->assertJsonStructure(['error']);

            // Verify user is still not verified
            $user->refresh();
            $this->assertNull($user->email_verified_at);

            return [
                'status' => $response->status(),
                'has_error_message' => !empty($response->json('error')),
                'user_still_unverified' => !$user->hasVerifiedEmail(),
            ];
        });
    }

    #[Test]
    public function password_reset_email_sending_is_consistent()
    {
        Notification::fake();
        
        $this->runEmailFlowTestWithBothDrivers(function ($authDriver) {
            // Create user
            $user = User::factory()->create([
                'email' => "reset-{$authDriver}@example.com",
                'password' => Hash::make('old-password'),
            ]);

            // Request password reset
            $response = $this->postJson('/api/forgot-password', [
                'email' => "reset-{$authDriver}@example.com",
            ]);

            $response->assertStatus(200);
            $response->assertJsonStructure([
                'data' => [
                    'message',
                ],
            ]);

            // Verify notification was sent
            Notification::assertSentTo($user, \App\Notifications\CustomPasswordReset::class);

            return [
                'status' => $response->status(),
                'has_message' => !empty($response->json('data.message')),
            ];
        });
    }

    #[Test]
    public function password_reset_token_validation_is_consistent()
    {
        $this->runEmailFlowTestWithBothDrivers(function ($authDriver) {
            // Create user
            $user = User::factory()->create([
                'email' => "token-{$authDriver}@example.com",
                'password' => Hash::make('old-password'),
            ]);

            // Generate a password reset token
            $token = app('auth.password.broker')->createToken($user);

            // Test token validation endpoint
            $response = $this->getJson("/api/password/reset/{$token}?email=" . urlencode($user->email));

            $response->assertStatus(200);
            $response->assertJsonStructure([
                'data' => [
                    'valid',
                    'email',
                ],
            ]);

            $data = $response->json('data');
            $this->assertTrue($data['valid']);
            $this->assertEquals($user->email, $data['email']);

            return [
                'status' => $response->status(),
                'token_valid' => $data['valid'],
                'email_matches' => $data['email'] === $user->email,
            ];
        });
    }

    #[Test]
    public function password_reset_completion_is_consistent()
    {
        $this->runEmailFlowTestWithBothDrivers(function ($authDriver) {
            // Create user
            $user = User::factory()->create([
                'email' => "complete-{$authDriver}@example.com",
                'password' => Hash::make('old-password'),
            ]);

            // Generate a password reset token
            $token = app('auth.password.broker')->createToken($user);

            // Reset password
            $response = $this->postJson('/api/reset-password', [
                'token' => $token,
                'email' => $user->email,
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ]);

            $response->assertStatus(200);
            $response->assertJsonStructure([
                'data' => [
                    'message',
                ],
            ]);

            // Verify password was changed
            $user->refresh();
            $this->assertTrue(Hash::check('new-password', $user->password));

            return [
                'status' => $response->status(),
                'has_message' => !empty($response->json('data.message')),
                'password_changed' => Hash::check('new-password', $user->password),
            ];
        });
    }

    #[Test]
    public function signed_url_generation_is_consistent()
    {
        $this->runEmailFlowTestWithBothDrivers(function ($authDriver) {
            // Create user
            $user = User::factory()->create([
                'email' => "signed-{$authDriver}@example.com",
                'email_verified_at' => null,
            ]);

            // Generate signed URLs
            $webUrl = URL::temporarySignedRoute(
                'verification.verify',
                now()->addMinutes(60),
                [
                    'id' => $user->id,
                    'hash' => sha1($user->email),
                ]
            );

            $apiUrl = URL::temporarySignedRoute(
                'verification.verify',
                now()->addMinutes(60),
                [
                    'id' => $user->id,
                    'hash' => sha1($user->email),
                ]
            );

            // Verify URLs are properly signed
            $this->assertStringContainsString('signature=', $webUrl);
            $this->assertStringContainsString('signature=', $apiUrl);
            $this->assertStringContainsString('expires=', $webUrl);
            $this->assertStringContainsString('expires=', $apiUrl);

            // Verify URLs contain correct parameters
            $this->assertStringContainsString("/email/verify/{$user->id}/", $webUrl);
            $this->assertStringContainsString("/email/verify/{$user->id}/", $apiUrl);
            $this->assertStringContainsString('/' . sha1($user->email), $webUrl);
            $this->assertStringContainsString('/' . sha1($user->email), $apiUrl);

            return [
                'web_url_signed' => str_contains($webUrl, 'signature='),
                'api_url_signed' => str_contains($apiUrl, 'signature='),
                'web_url_has_expires' => str_contains($webUrl, 'expires='),
                'api_url_has_expires' => str_contains($apiUrl, 'expires='),
            ];
        });
    }
}