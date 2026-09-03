<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\User;
use App\Models\WaitlistEntry;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RegistrationLocaleTest extends TestCase
{
    #[Test]
    public function registering_with_accept_language_seeds_user_locale(): void
    {
        $response = $this->withHeader('Accept-Language', 'vi')->postJson('/register', [
            'name' => 'Vi User',
            'email' => 'vi-user@example.com',
            'password' => 'Password1secure',
            'password_confirmation' => 'Password1secure',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'vi-user@example.com',
            'locale' => 'vi',
        ]);
    }

    #[Test]
    public function registering_with_unsupported_locale_falls_back_to_english(): void
    {
        $response = $this->withHeader('Accept-Language', 'pt-BR')->postJson('/register', [
            'name' => 'Pt User',
            'email' => 'pt-user@example.com',
            'password' => 'Password1secure',
            'password_confirmation' => 'Password1secure',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'pt-user@example.com',
            'locale' => 'en',
        ]);
    }

    #[Test]
    public function waitlist_stored_locale_wins_over_accept_language_at_invitation_acceptance(): void
    {
        $inviter = User::factory()->create();

        WaitlistEntry::create([
            'email' => 'waitlisted@example.com',
            'status' => 'pending',
            'locale' => 'ru',
        ]);

        $invitation = Invitation::factory()->create([
            'inviter_user_id' => $inviter->id,
            'email' => 'waitlisted@example.com',
        ]);

        $response = $this->withHeader('Accept-Language', 'vi')->postJson('/register', [
            'name' => 'Waitlisted User',
            'email' => 'waitlisted@example.com',
            'password' => 'Password1secure',
            'password_confirmation' => 'Password1secure',
            'invitation_code' => $invitation->code,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'waitlisted@example.com',
            'locale' => 'ru',
        ]);
    }
}
