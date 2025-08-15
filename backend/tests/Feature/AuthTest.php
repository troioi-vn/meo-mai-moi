<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\Traits\CreatesUsers;

class AuthTest extends TestCase
{
    use RefreshDatabase, CreatesUsers;

    #[Test]
    public function a_user_can_register_successfully()
    {
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
                     ]
                 ]);

        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
        ]);
    }

    #[Test]
    public function registration_fails_without_email()
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    #[Test]
    public function registration_fails_with_invalid_email_format()
    {
        $response = $this->postJson('/api/register', [
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
        $response = $this->postJson('/api/register', [
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
        $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'duplicate@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);
        $response = $this->postJson('/api/register', [
            'name' => 'Another User',
            'email' => 'duplicate@example.com',
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

        $response = $this->postJson('/api/login', [
            'email' => 'login@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'data' => [
                         'access_token',
                         'token_type',
                     ]
                 ]);
    }

    #[Test]
    public function login_fails_with_wrong_password()
    {
        User::factory()->create([
            'email' => 'wrongpass@example.com',
            'password' => bcrypt('password'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'wrongpass@example.com',
            'password' => 'wrong_password',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    #[Test]
    public function login_fails_with_non_existent_email()
    {
        $response = $this->postJson('/api/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'password',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    #[Test]
    public function a_user_can_logout_successfully()
    {
        $user = $this->createUserAndLogin();

        $response = $this->postJson('/api/logout');

        $response->assertStatus(200);

        // Verify that the token is deleted from the database
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_type' => get_class($user),
            'tokenable_id' => $user->id,
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
