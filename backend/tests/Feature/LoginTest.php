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
        $this->runLoginTestWithBothDrivers(function ($authDriver) {
            $user = User::factory()->create([
                'email' => "test-{$authDriver}@example.com",
                'password' => Hash::make('password'),
            ]);

            $response = $this->postJson('/api/login', [
                'email' => "test-{$authDriver}@example.com",
                'password' => 'password',
            ]);

            $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        'access_token',
                        'token_type',
                    ],
                ]);
        });
    }

    #[Test]
    public function test_user_cannot_login_with_invalid_credentials()
    {
        $this->runLoginTestWithBothDrivers(function ($authDriver) {
            $user = User::factory()->create([
                'email' => "test-{$authDriver}@example.com",
                'password' => Hash::make('password'),
            ]);

            $response = $this->postJson('/api/login', [
                'email' => "test-{$authDriver}@example.com",
                'password' => 'wrong-password',
            ]);

            $response->assertStatus(422)
                ->assertJsonValidationErrors(['email']);
        });
    }

    #[Test]
    public function test_unauthenticated_user_is_not_redirected_on_protected_api_route()
    {
        $response = $this->getJson('/api/user');

        $response->assertStatus(401)
            ->assertJson(['message' => 'Unauthenticated.']);
    }
}
