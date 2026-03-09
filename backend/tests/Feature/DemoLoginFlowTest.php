<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DemoLoginFlowTest extends TestCase
{
    #[Test]
    public function it_issues_a_demo_login_token_and_returns_a_login_url(): void
    {
        User::factory()->create([
            'email' => config('demo.user_email'),
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);

        $response = $this->postJson('/api/demo/login-token');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'token',
                    'login_url',
                    'expires_at',
                ],
            ]);

        $this->assertStringContainsString('/demo/login?token=', (string) $response->json('data.login_url'));
    }

    #[Test]
    public function it_logs_the_demo_user_in_and_invalidates_the_token_after_use(): void
    {
        $demoUser = User::factory()->create([
            'email' => config('demo.user_email'),
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);

        $token = (string) $this->postJson('/api/demo/login-token')->json('data.token');

        $response = $this->get('/demo/login?token='.$token);

        $response->assertRedirect('/');
        $this->assertAuthenticatedAs($demoUser);

        $this->get('/demo/login?token='.$token)->assertForbidden();
    }

    #[Test]
    public function it_rejects_expired_demo_login_tokens(): void
    {
        config(['demo.token_ttl_seconds' => 1]);

        User::factory()->create([
            'email' => config('demo.user_email'),
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);

        $token = (string) $this->postJson('/api/demo/login-token')->json('data.token');

        $this->travel(2)->seconds();

        $this->get('/demo/login?token='.$token)->assertForbidden();
        $this->assertGuest();
    }

    #[Test]
    public function it_rejects_missing_or_malformed_tokens(): void
    {
        User::factory()->create([
            'email' => config('demo.user_email'),
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);

        $this->get('/demo/login')->assertForbidden();
        $this->get('/demo/login?token=not-a-real-token')->assertForbidden();
    }

    #[Test]
    public function it_reports_when_the_demo_user_is_unavailable(): void
    {
        $this->postJson('/api/demo/login-token')
            ->assertStatus(503)
            ->assertJson([
                'success' => false,
                'message' => 'Demo is currently unavailable.',
            ]);
    }
}
