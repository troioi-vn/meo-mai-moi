<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailCheckTest extends TestCase
{
    use RefreshDatabase;

    public function test_check_email_returns_true_for_existing_email(): void
    {
        $user = User::factory()->create([
            'email' => 'existing@example.com',
        ]);

        $response = $this->postJson('/api/check-email', [
            'email' => 'existing@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'exists' => true,
                ],
            ]);
    }

    public function test_check_email_returns_false_for_non_existing_email(): void
    {
        $response = $this->postJson('/api/check-email', [
            'email' => 'nonexisting@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'exists' => false,
                ],
            ]);
    }

    public function test_check_email_validates_email_format(): void
    {
        $response = $this->postJson('/api/check-email', [
            'email' => 'invalid-email',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_check_email_requires_email_field(): void
    {
        $response = $this->postJson('/api/check-email', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }
}
