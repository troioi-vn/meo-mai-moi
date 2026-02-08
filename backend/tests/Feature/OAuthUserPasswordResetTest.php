<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class OAuthUserPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that an OAuth user (with no password) can set their first password via reset
     * and then login with that password.
     */
    public function test_oauth_user_can_set_password_and_login(): void
    {
        // Create a user without password (OAuth user)
        $user = User::factory()->create([
            'email' => 'oauth-test@example.com',
            'password' => null,
            'email_verified_at' => now(),
            'google_id' => 'google-123',
        ]);

        $this->assertNull($user->password);
        $this->assertFalse($user->has_password);

        // Create a password reset token
        $token = Password::createToken($user);

        // Reset the password using the API endpoint
        $response = $this->postJson('/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'NewPassword1reset',
            'password_confirmation' => 'NewPassword1reset',
        ]);

        $response->assertOk();

        // Refresh user and verify password was set
        $user->refresh();
        $this->assertNotNull($user->password);
        $this->assertTrue($user->has_password);
        $this->assertTrue(Hash::check('NewPassword1reset', $user->password));

        // Now try to login with the new password
        $loginResponse = $this->postJson('/login', [
            'email' => 'oauth-test@example.com',
            'password' => 'NewPassword1reset',
        ]);

        $loginResponse->assertOk();
        $loginResponse->assertJsonStructure([
            'data' => [
                'user' => ['id', 'email', 'name'],
                'two_factor',
            ],
        ]);
        $loginResponse->assertJsonPath('data.user.email', 'oauth-test@example.com');
    }

    /**
     * Test that a regular user can reset their password and login with the new one.
     */
    public function test_regular_user_can_reset_password_and_login(): void
    {
        // Create a user with password
        $user = User::factory()->create([
            'email' => 'regular@example.com',
            'password' => Hash::make('oldpassword'),
            'email_verified_at' => now(),
        ]);

        $this->assertTrue($user->has_password);

        // Create a password reset token
        $token = Password::createToken($user);

        // Reset the password using the API endpoint
        $response = $this->postJson('/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'NewPassword2reset',
            'password_confirmation' => 'NewPassword2reset',
        ]);

        $response->assertOk();

        // Refresh user and verify password was changed
        $user->refresh();
        $this->assertTrue(Hash::check('NewPassword2reset', $user->password));
        $this->assertFalse(Hash::check('oldpassword', $user->password));

        // Try login with old password (should fail)
        $oldLoginResponse = $this->postJson('/login', [
            'email' => 'regular@example.com',
            'password' => 'oldpassword',
        ]);
        $oldLoginResponse->assertUnprocessable();

        // Try login with new password (should succeed)
        $newLoginResponse = $this->postJson('/login', [
            'email' => 'regular@example.com',
            'password' => 'NewPassword2reset',
        ]);
        $newLoginResponse->assertOk();
        $newLoginResponse->assertJsonPath('data.user.email', 'regular@example.com');
    }

    /**
     * Test that password reset doesn't break for users without google_id.
     */
    public function test_password_reset_works_for_email_registered_user(): void
    {
        // Create a user registered via email (no google_id)
        $user = User::factory()->create([
            'email' => 'email-user@example.com',
            'password' => Hash::make('originalpass'),
            'email_verified_at' => now(),
            'google_id' => null,
        ]);

        // Create a password reset token
        $token = Password::createToken($user);

        // Reset the password
        $response = $this->postJson('/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'ResetPassword3new',
            'password_confirmation' => 'ResetPassword3new',
        ]);

        $response->assertOk();

        // Verify login works with new password
        $loginResponse = $this->postJson('/login', [
            'email' => 'email-user@example.com',
            'password' => 'ResetPassword3new',
        ]);

        $loginResponse->assertOk();
    }
}
