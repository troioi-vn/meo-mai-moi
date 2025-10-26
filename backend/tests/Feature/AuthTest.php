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
        $response = $this->postJson('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'user',
                    'email_verified',
                    'email_sent',
                    'requires_verification',
                    'message',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
        ]);
    }

    #[Test]
    public function registration_fails_without_email()
    {
        $response = $this->postJson('/register', [
            'name' => 'Test User',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    #[Test]
    public function registration_fails_with_invalid_email_format()
    {
        $response = $this->postJson('/register', [
            'name' => 'Test User',
            'email' => 'invalid-email',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    #[Test]
    public function registration_fails_when_passwords_do_not_match()
    {
        $response = $this->postJson('/register', [
            'name' => 'Test User',
            'email' => 'test2@example.com',
            'password' => 'password',
            'password_confirmation' => 'wrong_password',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    #[Test]
    public function registration_fails_with_duplicate_email()
    {
        $email = 'duplicate@example.com';
        User::factory()->create([
            'email' => $email,
            'password' => bcrypt('password'),
        ]);

        $response = $this->postJson('/register', [
            'name' => 'Another User',
            'email' => $email,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    #[Test]
    public function a_user_can_login_successfully()
    {
        User::factory()->create([
            'email' => 'login@example.com',
            'password' => bcrypt('password'),
        ]);

        $response = $this->postJson('/login', [
            'email' => 'login@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'user',
                    'two_factor',
                ],
            ]);
    }

    #[Test]
    public function login_fails_with_wrong_password()
    {
        User::factory()->create([
            'email' => 'wrongpass@example.com',
            'password' => bcrypt('password'),
        ]);

        $response = $this->postJson('/login', [
            'email' => 'wrongpass@example.com',
            'password' => 'wrong_password',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    #[Test]
    public function login_fails_with_non_existent_email()
    {
        $response = $this->postJson('/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'password',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    #[Test]
    public function a_user_can_logout_successfully()
    {
        $user = $this->createUserAndLogin();

        $response = $this->postJson('/logout');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'redirect',
            ]);
    }

    #[Test]
    public function authenticated_user_can_access_api_user_endpoint()
    {
        $user = $this->createUserAndLogin();

        $response = $this->getJson('/api/user');

        $response->assertStatus(200)
            ->assertJson(['data' => ['email' => $user->email]]);
    }
}
