<?php

namespace Tests\Feature;

use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

class OptionalAuthMiddlewareTest extends TestCase
{
    use RefreshDatabase;


    #[Test]
    public function test_optional_auth_ignores_invalid_token(): void
    {
        // Make request with invalid bearer token
        $response = $this->withHeaders([
            'Authorization' => 'Bearer invalid-token-xyz'
        ])->getJson('/api/version');
        
        // Should succeed and treat as guest
        $response->assertStatus(200);
        $this->assertGuest();
    }

    #[Test]
    public function test_optional_auth_ignores_malformed_auth_header(): void
    {
        // Test various malformed authorization headers
        $malformedHeaders = [
            'InvalidFormat token123',
            'Bearer',  // Missing token
            'Basic dXNlcjpwYXNz',  // Wrong auth type
            'Bearer ',  // Empty token
        ];

        foreach ($malformedHeaders as $authHeader) {
            $response = $this->withHeaders([
                'Authorization' => $authHeader
            ])->getJson('/api/version');
            
            $response->assertStatus(200);
            $this->assertGuest();
        }
    }

    #[Test]
    public function test_optional_auth_handles_expired_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-token');
        
        // Delete the token to simulate expiration
        $token->accessToken->delete();
        
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken
        ])->getJson('/api/version');
        
        // Should succeed and treat as guest
        $response->assertStatus(200);
        $this->assertGuest();
    }

    #[Test]
    public function test_optional_auth_preserves_user_context_across_requests(): void
    {
        $user = User::factory()->create(['name' => 'Test User']);
        Sanctum::actingAs($user);
        
        // Make multiple requests to verify user context is maintained
        $response1 = $this->getJson('/api/version');
        $response2 = $this->getJson('/api/version');
        
        $response1->assertStatus(200);
        $response2->assertStatus(200);
        
        // Both requests should have the same authenticated user
        $this->assertAuthenticatedAs($user);
    }
}
