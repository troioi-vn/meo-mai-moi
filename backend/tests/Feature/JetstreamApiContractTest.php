<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class JetstreamApiContractTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test API contracts with both auth drivers
     */
    protected function runApiContractTestWithBothDrivers(callable $testCallback): void
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
        $this->assertEquals($customResult, $jetstreamResult, 'API responses differ between auth drivers');
    }

    #[Test]
    public function register_endpoint_maintains_response_format()
    {
        $this->runApiContractTestWithBothDrivers(function ($authDriver) {
            $response = $this->postJson('/register', [
                'name' => 'Test User',
                'email' => "test-{$authDriver}@example.com",
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);

            $response->assertStatus(201);

            // Verify exact response structure (cookie-based, no tokens)
            $response->assertJsonStructure([
                'data' => [
                    'user' => ['id', 'name', 'email', 'email_verified_at'],
                    'email_verified',
                    'email_sent',
                    'requires_verification',
                    'message',
                ],
            ]);

            $data = $response->json('data');

            // Verify response field types and values
            $this->assertIsArray($data['user']);
            $this->assertIsInt($data['user']['id']);
            $this->assertEquals("test-{$authDriver}@example.com", $data['user']['email']);
            $this->assertIsBool($data['email_verified']);
            $this->assertIsBool($data['email_sent']);
            $this->assertIsBool($data['requires_verification']);
            $this->assertIsString($data['message']);

            return [
                'status' => $response->status(),
                'structure' => array_keys($data),
                'has_user' => isset($data['user']),
            ];
        });
    }

    #[Test]
    public function login_endpoint_maintains_response_format()
    {
        $this->runApiContractTestWithBothDrivers(function ($authDriver) {
            // Create user
            $user = User::factory()->create([
                'email' => "login-{$authDriver}@example.com",
                'password' => Hash::make('password'),
            ]);

            $response = $this->postJson('/login', [
                'email' => "login-{$authDriver}@example.com",
                'password' => 'password',
            ]);

            $response->assertStatus(200);

            // Verify exact response structure (cookie-based, no tokens)
            $response->assertJsonStructure([
                'data' => [
                    'user' => ['id', 'name', 'email', 'email_verified_at'],
                    'two_factor',
                ],
            ]);

            $data = $response->json('data');

            // Verify response field types and values
            $this->assertIsArray($data['user']);
            $this->assertIsInt($data['user']['id']);
            $this->assertEquals("login-{$authDriver}@example.com", $data['user']['email']);
            $this->assertIsBool($data['two_factor']);

            return [
                'status' => $response->status(),
                'structure' => array_keys($data),
                'has_user' => isset($data['user']),
            ];
        });
    }

    #[Test]
    public function logout_endpoint_maintains_response_format()
    {
        $this->runApiContractTestWithBothDrivers(function ($authDriver) {
            // Create and authenticate user (cookie-based session auth)
            $user = User::factory()->create([
                'email' => "logout-{$authDriver}@example.com",
            ]);

            $response = $this->actingAs($user, 'web')->postJson('/logout');

            $response->assertStatus(200);

            // Verify logout response structure (no nested 'data')
            $response->assertJsonStructure([
                'message',
                'redirect',
            ]);

            $data = $response->json();
            $this->assertIsString($data['message']);
            $this->assertIsString($data['redirect']);
            $this->assertEquals('/login', $data['redirect']);

            return [
                'status' => $response->status(),
                'structure' => array_keys($data),
            ];
        });
    }

    #[Test]
    public function forgot_password_endpoint_maintains_response_format()
    {
        Notification::fake();

        $this->runApiContractTestWithBothDrivers(function ($authDriver) {
            // Create user
            $user = User::factory()->create([
                'email' => "forgot-{$authDriver}@example.com",
            ]);

            $response = $this->postJson('/api/forgot-password', [
                'email' => "forgot-{$authDriver}@example.com",
            ]);

            $response->assertStatus(200);

            // Verify response structure
            $response->assertJsonStructure([
                'data' => [
                    'message',
                ],
            ]);

            $data = $response->json('data');
            $this->assertIsString($data['message']);

            return [
                'status' => $response->status(),
                'structure' => array_keys($data),
            ];
        });
    }

    #[Test]
    public function validation_errors_maintain_consistent_format()
    {
        $this->runApiContractTestWithBothDrivers(function ($authDriver) {
            // Test registration validation
            $response = $this->postJson('/register', [
                'name' => '',
                'email' => 'invalid-email',
                'password' => 'short',
            ]);

            $response->assertStatus(422);

            // Verify validation error structure
            $response->assertJsonStructure([
                'message',
                'errors' => [
                    'name',
                    'email',
                    'password',
                ],
            ]);

            return [
                'status' => $response->status(),
                'has_message' => $response->json('message') !== null,
                'has_errors' => $response->json('errors') !== null,
                'error_fields' => array_keys($response->json('errors')),
            ];
        });
    }

    #[Test]
    public function unauthenticated_responses_maintain_consistent_format()
    {
        $this->runApiContractTestWithBothDrivers(function ($authDriver) {
            $response = $this->getJson('/api/user');

            $response->assertStatus(401);

            // Verify unauthenticated response structure
            $response->assertJson([
                'message' => 'Unauthenticated.',
            ]);

            return [
                'status' => $response->status(),
                'message' => $response->json('message'),
            ];
        });
    }

    #[Test]
    public function protected_route_access_maintains_consistent_format()
    {
        $this->runApiContractTestWithBothDrivers(function ($authDriver) {
            // Create and authenticate user
            $user = User::factory()->create([
                'email' => "protected-{$authDriver}@example.com",
                'email_verified_at' => now(), // Ensure user is verified
            ]);
            $token = $user->createToken('test')->plainTextToken;

            $response = $this->withHeaders([
                'Authorization' => 'Bearer '.$token,
            ])->getJson('/api/user');

            $response->assertStatus(200);

            // Verify authenticated user response structure
            $response->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'email',
                    'email_verified_at',
                    'created_at',
                    'updated_at',
                ],
            ]);

            $data = $response->json('data');

            // Verify the response has the expected structure and types
            $this->assertIsInt($data['id']);
            $this->assertIsString($data['name']);
            $this->assertIsString($data['email']);
            $this->assertNotNull($data['email_verified_at']);
            $this->assertIsString($data['created_at']);
            $this->assertIsString($data['updated_at']);

            return [
                'status' => $response->status(),
                'structure' => array_keys($data),
                'has_required_fields' => isset($data['id'], $data['name'], $data['email']),
            ];
        });
    }
}
