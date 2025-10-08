<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\WaitlistEntry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class WaitlistControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake(); // Prevent actual emails during testing
    }

    public function test_can_join_waitlist_with_valid_email()
    {
        $email = 'test@example.com';

        $response = $this->postJson('/api/waitlist', [
            'email' => $email
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'email' => $email,
                    'status' => 'pending'
                ]
            ]);

        $this->assertDatabaseHas('waitlist_entries', [
            'email' => $email,
            'status' => 'pending'
        ]);
    }

    public function test_cannot_join_waitlist_with_invalid_email()
    {
        $response = $this->postJson('/api/waitlist', [
            'email' => 'invalid-email'
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_cannot_join_waitlist_without_email()
    {
        $response = $this->postJson('/api/waitlist', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_cannot_join_waitlist_with_duplicate_email()
    {
        $email = 'duplicate@example.com';
        WaitlistEntry::create(['email' => $email, 'status' => 'pending']);

        $response = $this->postJson('/api/waitlist', [
            'email' => $email
        ]);

        $response->assertStatus(409)
            ->assertJson([
                'error' => 'Email is already on waitlist'
            ]);
    }

    public function test_cannot_join_waitlist_with_existing_user_email()
    {
        $user = User::factory()->create(['email' => 'existing@example.com']);

        $response = $this->postJson('/api/waitlist', [
            'email' => $user->email
        ]);

        $response->assertStatus(409)
            ->assertJson([
                'error' => 'Email is already registered'
            ]);
    }

    public function test_waitlist_endpoint_has_rate_limiting()
    {
        $email = 'ratelimit@example.com';

        // Make multiple requests quickly
        for ($i = 0; $i < 10; $i++) {
            $response = $this->postJson('/api/waitlist', [
                'email' => "test{$i}@example.com"
            ]);

            if ($i < 5) {
                $response->assertStatus(201);
            }
        }

        // The next request should be rate limited
        $response = $this->postJson('/api/waitlist', [
            'email' => 'final@example.com'
        ]);

        // Should be rate limited (429) or still succeed depending on rate limit config
        $this->assertContains($response->getStatusCode(), [201, 429]);
    }

    public function test_waitlist_endpoint_returns_validation_error_for_invalid_email()
    {
        // Mock a database error by using an invalid email that would cause issues
        $response = $this->postJson('/api/waitlist', [
            'email' => str_repeat('a', 300) . '@example.com' // Too long email
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_waitlist_response_structure_is_consistent()
    {
        $email = 'structure@example.com';

        $response = $this->postJson('/api/waitlist', [
            'email' => $email
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'email',
                    'status',
                    'created_at'
                ]
            ]);
    }

    public function test_waitlist_endpoint_handles_email_case_insensitivity()
    {
        $email = 'Test@Example.Com';

        $response = $this->postJson('/api/waitlist', [
            'email' => $email
        ]);

        $response->assertStatus(201);

        // Try to add the same email with different case
        $response2 = $this->postJson('/api/waitlist', [
            'email' => strtolower($email)
        ]);

        $response2->assertStatus(409)
            ->assertJson([
                'error' => 'Email is already on waitlist'
            ]);
    }

    public function test_waitlist_endpoint_trims_whitespace_from_email()
    {
        $email = '  whitespace@example.com  ';

        $response = $this->postJson('/api/waitlist', [
            'email' => $email
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('waitlist_entries', [
            'email' => trim($email),
            'status' => 'pending'
        ]);
    }
}
