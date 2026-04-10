<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TelegramTokenAuthControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_authenticates_the_user_and_consumes_the_token(): void
    {
        $user = User::factory()->create();
        $token = str_repeat('a', 64);

        Cache::put('telegram-miniapp-login:'.$token, $user->id, now()->addMinutes(5));

        $this->postJson('/api/auth/telegram/token', [
            'token' => $token,
        ])->assertOk()
            ->assertJsonPath('data.user.id', $user->id);

        $this->assertAuthenticatedAs($user);
        $this->assertNull(Cache::get('telegram-miniapp-login:'.$token));

        $this->postJson('/api/auth/telegram/token', [
            'token' => $token,
        ])->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Invalid or expired token.',
            ]);
    }

    #[Test]
    public function it_consumes_tokens_even_when_the_user_record_is_missing(): void
    {
        $token = str_repeat('b', 64);

        Cache::put('telegram-miniapp-login:'.$token, 999999, now()->addMinutes(5));

        $this->postJson('/api/auth/telegram/token', [
            'token' => $token,
        ])->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'User not found.',
            ]);

        $this->assertNull(Cache::get('telegram-miniapp-login:'.$token));
        $this->assertGuest();
    }
}
