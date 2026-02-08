<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test login with both auth drivers
     */
    protected function runLoginTestWithBothDrivers(callable $testCallback): void
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
    public function test_user_can_login_with_valid_credentials()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('Password1secure'),
        ]);

        $response = $this->withoutMiddleware([
            \Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class,
        ])->postJson('/login', [
            'email' => 'test@example.com',
            'password' => 'Password1secure',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'user',
                    'two_factor',
                ],
            ]);

        // Verify user is authenticated via session
        $this->assertAuthenticated();
    }

    #[Test]
    public function test_login_with_remember_sets_remember_cookie_and_token()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('Password1secure'),
            'remember_token' => null,
        ]);

        $response = $this->withoutMiddleware([
            \Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class,
        ])->postJson('/login', [
            'email' => 'test@example.com',
            'password' => 'Password1secure',
            'remember' => true,
        ]);

        $response->assertStatus(200);
        $this->assertAuthenticated();

        $user->refresh();
        $this->assertNotEmpty($user->getRememberToken());

        $cookies = $response->headers->getCookies();
        $hasRememberCookie = false;
        foreach ($cookies as $cookie) {
            if (str_starts_with($cookie->getName(), 'remember_web')) {
                $hasRememberCookie = true;
                break;
            }
        }

        $this->assertTrue($hasRememberCookie, 'Expected a remember_web* cookie to be set when remember=true.');
    }

    #[Test]
    public function test_user_cannot_login_with_invalid_credentials()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('Password1secure'),
        ]);

        $response = $this->postJson('/login', [
            'email' => 'test@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    #[Test]
    public function test_unauthenticated_user_is_not_redirected_on_protected_api_route()
    {
        $response = $this->getJson('/api/user');

        $response->assertStatus(401)
            ->assertJson(['message' => 'Unauthenticated.']);
    }
}
