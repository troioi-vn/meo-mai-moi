<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class EmailLinkIntegrationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test email links with both auth drivers
     */
    protected function runEmailLinkTestWithBothDrivers(callable $testCallback): void
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

    public function test_complete_email_verification_flow()
    {
        // Create unverified user
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'email_verified_at' => null,
        ]);

        $this->assertFalse($user->hasVerifiedEmail());

        // Generate verification URL (simulating what would be in email)
        $verificationUrl = \Illuminate\Support\Facades\URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->getKey(),
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );

        // User clicks the verification link
        $response = $this->get($verificationUrl);

        // Standard Fortify behavior: unauthenticated users are redirected to login
        $response->assertRedirect(route('login', absolute: false));

        // Not verified yet (must be logged in to verify)
        $user->refresh();
        $this->assertFalse($user->hasVerifiedEmail());

        // Clear intended URL set by previous redirect to login
        session()->forget('url.intended');
        // After login, visiting the link verifies and redirects to dashboard
        $response = $this->actingAs($user)->get($verificationUrl);
        $response->assertRedirect(route('dashboard', absolute: false).'?verified=1');
        $user->refresh();
        $this->assertTrue($user->hasVerifiedEmail());
    }

    public function test_complete_password_reset_flow()
    {
        $this->runEmailLinkTestWithBothDrivers(function ($authDriver) {
            // Create user
            $user = User::factory()->create([
                'email' => "test-{$authDriver}@example.com",
                'password' => bcrypt('old-password'),
            ]);

            // Request password reset (simulating API call)
            $response = $this->postJson('/api/password/email', [
                'email' => "test-{$authDriver}@example.com",
            ]);

            $response->assertStatus(200);

            // Generate reset token (simulating what would be in email)
            $token = Password::createToken($user);

            // User clicks the reset link from email
            $resetLinkResponse = $this->get("/reset-password/{$token}?email=".urlencode($user->email));

            // Should redirect to frontend
            $resetLinkResponse->assertRedirect();
            $redirectUrl = $resetLinkResponse->headers->get('Location');

            $this->assertStringStartsWith('http://localhost:5173', $redirectUrl);
            $this->assertStringContainsString('/password/reset/', $redirectUrl);
            $this->assertStringContainsString($token, $redirectUrl);

            // User submits new password (simulating frontend form submission)
            $resetResponse = $this->postJson('/api/password/reset', [
                'token' => $token,
                'email' => $user->email,
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ]);

            $resetResponse->assertStatus(200);

            // Verify password was changed
            $user->refresh();
            $this->assertTrue(\Hash::check('new-password', $user->password));
            $this->assertFalse(\Hash::check('old-password', $user->password));
        });
    }

    public function test_email_links_use_correct_frontend_url()
    {
        // Test with custom frontend URL
        config(['app.frontend_url' => 'https://example.com']);

        $user = User::factory()->create(['email_verified_at' => null]);

        // Test email verification redirect
        $verificationUrl = \Illuminate\Support\Facades\URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->getKey(),
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );

        $response = $this->get($verificationUrl);
        // Standard Fortify behavior: unauthenticated users are redirected to login
        $response->assertRedirect(route('login', absolute: false));

        // Test password reset redirect
        $token = 'test-token';
        $resetResponse = $this->get("/reset-password/{$token}?email=test@example.com");
        $resetRedirectUrl = $resetResponse->headers->get('Location');
        $this->assertStringStartsWith('https://example.com', $resetRedirectUrl);
    }
}
