<?php

declare(strict_types=1);

namespace Tests\Feature;

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
}
