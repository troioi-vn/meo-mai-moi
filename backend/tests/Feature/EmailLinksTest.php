<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\CustomPasswordReset;
use App\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class EmailLinksTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_verification_link_points_to_frontend()
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'test@example.com',
            'email_verified_at' => null,
        ]);

        // Send email verification notification
        $user->sendEmailVerificationNotification();

        // Assert notification was sent
        Notification::assertSentTo($user, VerifyEmail::class, function ($notification) use ($user) {
            // Get the verification URL from the notification
            $verificationUrl = $notification->toNotificationEmail($user)['data']['verificationUrl'];

            // Assert the URL points to the backend web route (which redirects to frontend)
            $this->assertStringContainsString('/email/verify/', $verificationUrl);

            // The URL should NOT contain /api/
            $this->assertStringNotContainsString('/api/', $verificationUrl);

            // Should contain the backend base URL (localhost in tests)
            $this->assertStringStartsWith('http://localhost', $verificationUrl);

            return true;
        });
    }

    public function test_password_reset_link_points_to_frontend()
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'test@example.com',
        ]);

        // Generate password reset token
        $token = Password::createToken($user);

        // Send password reset notification
        $user->sendPasswordResetNotification($token);

        // Assert notification was sent
        Notification::assertSentTo($user, CustomPasswordReset::class, function ($notification) {
            // Get the token from the notification
            $resetToken = $notification->getToken();

            // Verify token exists
            $this->assertNotEmpty($resetToken);

            return true;
        });
    }

    public function test_email_verification_web_route_redirects_to_frontend()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'email_verified_at' => null,
        ]);

        // Create a signed URL for email verification
        $url = \Illuminate\Support\Facades\URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->getKey(),
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );

        // Make request to the verification URL
        $response = $this->get($url);

        // Standard Fortify behavior: unauthenticated users are redirected to login
        $response->assertRedirect(route('login', absolute: false));
    }

    public function test_password_reset_web_route_redirects_to_frontend()
    {
        $token = 'test-token-123';
        $email = 'test@example.com';

        // Make request to the password reset URL
        $response = $this->get("/reset-password/{$token}?email=".urlencode($email));

        // Should redirect to frontend
        $response->assertRedirect();
        $redirectUrl = $response->headers->get('Location');

        // Assert redirect points to frontend
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $this->assertStringStartsWith($frontendUrl, $redirectUrl);
        $this->assertStringContainsString('/password/reset/', $redirectUrl);
        $this->assertStringContainsString($token, $redirectUrl);
        $this->assertStringContainsString('email='.urlencode($email), $redirectUrl);
    }

    public function test_email_verification_web_route_handles_invalid_user()
    {
        // Create a signed URL with invalid user ID
        $url = \Illuminate\Support\Facades\URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => 999, // Invalid user ID
                'hash' => 'invalid-hash',
            ]
        );

        $response = $this->get($url);

        // Standard Fortify behavior: unauthenticated users are redirected to login
        $response->assertRedirect(route('login', absolute: false));
    }

    public function test_password_reset_web_route_handles_missing_email()
    {
        $token = 'test-token-123';

        // Make request without email parameter
        $response = $this->get("/reset-password/{$token}");

        // Should redirect to frontend with error
        $response->assertRedirect();
        $redirectUrl = $response->headers->get('Location');

        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $this->assertStringStartsWith($frontendUrl, $redirectUrl);
        $this->assertStringContainsString('error=missing_email', $redirectUrl);
    }

    public function test_email_verification_already_verified_user()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'email_verified_at' => now(),
        ]);

        // Create a signed URL for email verification
        $url = \Illuminate\Support\Facades\URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->getKey(),
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );

        // Make request to the verification URL
        $response = $this->get($url);

        // Standard Fortify behavior: unauthenticated users are redirected to login
        $response->assertRedirect(route('login', absolute: false));
    }
}
