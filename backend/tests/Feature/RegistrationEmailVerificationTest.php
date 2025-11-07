<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RegistrationEmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_sends_only_one_verification_notification_on_registration(): void
    {
        // Force setting: email verification required
        config()->set('settings.cache.email_verification_required', 'true');
        // Some code paths use service; simplest is to set underlying cache key if service caches
        cache()->put('settings:email_verification_required', 'true', 300);

        $payload = [
            'name' => 'Jane Tester',
            'email' => 'jane@example.test',
            'password' => 'Password123!$',
            'password_confirmation' => 'Password123!$',
            'terms' => true,
        ];

        // Use regular POST (Fortify web route), expect redirect then JSON follow-up
        $response = $this->post('/register', $payload);
        $response->assertStatus(302); // Fortify may redirect after successful registration for web requests

        sleep(1);

        // Simulate authenticated JSON follow-up to /api/user or rely on session state

        $user = User::where('email', 'jane@example.test')->first();
        $this->assertNotNull($user, 'User should be created');

        // There should be exactly one email_verification notification record in DB
        $this->assertSame(1, $user->notifications()->where('type', 'email_verification')->count(), 'Expected exactly one email_verification notification');
        $this->assertSame(1, \App\Models\EmailLog::where('notification_id', $user->notifications()->where('type', 'email_verification')->first()->id)->count(), 'Expected one EmailLog for verification email');

        // Simulate a fresh guest attempting a new registration
        Auth::logout();
        session()->invalidate();
        session()->regenerateToken();

        // Hitting registration response already queued send; calling RegisterResponse logic again should not create more within 30s
        $this->post('/register', [
            'name' => 'Duplicate User',
            'email' => 'jane2@example.test',
            'password' => 'Password123!$',
            'password_confirmation' => 'Password123!$',
            'terms' => true,
        ])->assertStatus(302);

        // Hitting registration response already queued send; calling RegisterResponse logic again should not create more within 30s

        // Original user should still only have one; new user should also have one
        $this->assertSame(1, $user->fresh()->notifications()->where('type', 'email_verification')->count());
        $user2 = User::where('email', 'jane2@example.test')->first();
        $this->assertNotNull($user2, 'Second user should be created with email jane2@example.test');
        $this->assertSame(1, $user2->notifications()->where('type', 'email_verification')->count());
    }
}
