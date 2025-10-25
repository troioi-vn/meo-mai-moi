<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Tests\Traits\CreatesUsers;

class AuthTest extends TestCase
{
    use CreatesUsers;
    use RefreshDatabase;

    /**
     * Test registration with both auth drivers
     */
    protected function runRegistrationTestWithBothDrivers(callable $testCallback): void
    {
        // Test with custom auth driver
        config(['app.env' => 'testing']);
        putenv('AUTH_DRIVER=custom');
        $testCallback('custom');

        // Test with jetstream auth driver
        putenv('AUTH_DRIVER=jetstream');
        $testCallback('jetstream');
        
        // Reset to default
        putenv('AUTH_DRIVER=custom');
    }

    #[Test]
    public function a_user_can_register_successfully()
    {
        $this->runRegistrationTestWithBothDrivers(function ($authDriver) {
            $response = $this->postJson('/api/register', [
                'name' => 'Test User',
                'email' => "test-{$authDriver}@example.com",
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
                ]);

            $this->assertDatabaseHas('users', [
                'email' => "test-{$authDriver}@example.com",
            ]);
        });
    }

    #[Test]
    public function registration_fails_without_email()
    {
        $this->runRegistrationTestWithBothDrivers(function ($authDriver) {
            $response = $this->postJson('/api/register', [
                'name' => 'Test User',
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);
            $response->assertStatus(422)->assertJsonValidationErrors(['email']);
        });
    }

    #[Test]
    public function registration_fails_with_invalid_email_format()
    {
        $this->runRegistrationTestWithBothDrivers(function ($authDriver) {
            $response = $this->postJson('/api/register', [
                'name' => 'Test User',
                'email' => 'invalid-email',
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);
            $response->assertStatus(422)->assertJsonValidationErrors(['email']);
        });
    }

    #[Test]
    public function registration_fails_when_passwords_do_not_match()
    {
        $this->runRegistrationTestWithBothDrivers(function ($authDriver) {
            $response = $this->postJson('/api/register', [
                'name' => 'Test User',
                'email' => "test2-{$authDriver}@example.com",
                'password' => 'password',
                'password_confirmation' => 'wrong_password',
            ]);
            $response->assertStatus(422)->assertJsonValidationErrors(['password']);
        });
    }

    #[Test]
    public function registration_fails_with_duplicate_email()
    {
        $this->runRegistrationTestWithBothDrivers(function ($authDriver) {
            $email = "duplicate-{$authDriver}@example.com";
            
            $this->postJson('/api/register', [
                'name' => 'Test User',
                'email' => $email,
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);
            
            $response = $this->postJson('/api/register', [
                'name' => 'Another User',
                'email' => $email,
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);
            
            $response->assertStatus(422)->assertJsonValidationErrors(['email']);
        });
    }

    #[Test]
    public function a_user_can_login_successfully()
    {
        $this->runRegistrationTestWithBothDrivers(function ($authDriver) {
            User::factory()->create([
                'email' => "login-{$authDriver}@example.com",
                'password' => bcrypt('password'),
            ]);

            $response = $this->postJson('/api/login', [
                'email' => "login-{$authDriver}@example.com",
                'password' => 'password',
            ]);

            $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        'access_token',
                        'token_type',
                        'email_verified',
                    ],
                ]);
        });
    }

    #[Test]
    public function login_fails_with_wrong_password()
    {
        $this->runRegistrationTestWithBothDrivers(function ($authDriver) {
            User::factory()->create([
                'email' => "wrongpass-{$authDriver}@example.com",
                'password' => bcrypt('password'),
            ]);

            $response = $this->postJson('/api/login', [
                'email' => "wrongpass-{$authDriver}@example.com",
                'password' => 'wrong_password',
            ]);
            $response->assertStatus(422)->assertJsonValidationErrors(['email']);
        });
    }

    #[Test]
    public function login_fails_with_non_existent_email()
    {
        $this->runRegistrationTestWithBothDrivers(function ($authDriver) {
            $response = $this->postJson('/api/login', [
                'email' => "nonexistent-{$authDriver}@example.com",
                'password' => 'password',
            ]);
            $response->assertStatus(422)->assertJsonValidationErrors(['email']);
        });
    }

    #[Test]
    public function a_user_can_logout_successfully()
    {
        $this->runRegistrationTestWithBothDrivers(function ($authDriver) {
            $user = $this->createUserAndLogin();

            $response = $this->postJson('/api/logout');

            $response->assertStatus(200);

            // Verify that the token is deleted from the database
            $this->assertDatabaseMissing('personal_access_tokens', [
                'tokenable_type' => get_class($user),
                'tokenable_id' => $user->id,
            ]);
        });
    }

    #[Test]
    public function authenticated_user_can_access_api_user_endpoint()
    {
        $this->runRegistrationTestWithBothDrivers(function ($authDriver) {
            $user = $this->createUserAndLogin();

            $response = $this->getJson('/api/user');

            $response->assertStatus(200)
                ->assertJson(['data' => ['email' => $user->email]]);
        });
    }
}
