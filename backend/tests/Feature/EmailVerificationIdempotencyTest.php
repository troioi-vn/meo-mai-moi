<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailVerificationIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_creates_at_most_one_verification_notification_per_user_within_window(): void
    {
        // Force setting: email verification required
        cache()->put('settings:email_verification_required', 'true', 300);

        // Register first user
        $payload1 = [
            'name' => 'Jane Tester',
            'email' => 'jane@example.test',
            'password' => 'Password123!$',
            'password_confirmation' => 'Password123!$',
            'terms' => true,
        ];

        $this->post('/register', $payload1)->assertStatus(302);
        $user1 = User::where('email', 'jane@example.test')->firstOrFail();

        // There should be one notification
        $this->assertSame(1, $user1->notifications()->where('type', 'email_verification')->count());

        // Immediately resend via API route (inside 30s window)
        $this->actingAs($user1);
        $this->postJson('/api/email/verification-notification')->assertOk();

        // Still only one notification within the window
        $this->assertSame(1, $user1->fresh()->notifications()->where('type', 'email_verification')->count());
    }
}
