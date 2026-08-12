<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Services\Telegram\TelegramLoginHandshakeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use NotificationChannels\Telegram\Telegram;
use Tests\TestCase;

class TelegramLoginHandshakeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('telegram.user_bot.username', 'meo_test_bot');
        config()->set('telegram.user_bot.token', 'test-token');
        config()->set('app.url', 'https://app.example.test');
        config()->set('app.frontend_url', 'https://app.example.test');

        Http::fake();
    }

    public function test_originating_browser_can_claim_an_approved_handshake_once(): void
    {
        $this->withSession(['telegram_handshake_test' => true]);
        $this->withCookie((string) config('session.cookie'), session()->getId())->withCredentials();

        $messages = [];
        $this->mock(Telegram::class, function ($mock) use (&$messages): void {
            $mock->shouldReceive('setToken')->andReturnSelf();
            $mock->shouldReceive('sendMessage')->twice()->withArgs(function (array $params) use (&$messages): bool {
                $messages[] = $params;

                return true;
            });
        });

        $createResponse = $this->postJson('/api/auth/telegram/handshake', [
            'locale' => 'vi',
            'redirect_path' => '/account/pets',
        ])->assertOk();

        $nonce = $createResponse->json('data.nonce');
        $this->assertIsString($nonce);
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9]{32}$/', $nonce);
        $createResponse->assertJsonPath('data.deep_link', "https://t.me/meo_test_bot?start=hs_{$nonce}");
        $userCode = $createResponse->json('data.user_code');
        $this->assertIsString($userCode);
        $this->assertMatchesRegularExpression('/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/', $userCode);

        $this->postJson("/api/auth/telegram/handshake/{$nonce}")
            ->assertOk()
            ->assertJsonPath('data.status', 'pending');

        $user = User::factory()->create([
            'name' => 'Athanasius',
            'locale' => 'en',
            'telegram_user_id' => 123456,
        ]);

        $this->postJson('/api/webhooks/telegram', [
            'message' => [
                'text' => "/start hs_{$nonce}",
                'chat' => ['id' => 123456],
                'from' => ['id' => 123456, 'first_name' => 'Athanasius', 'language_code' => 'ru-RU'],
            ],
        ])->assertOk();

        $this->assertCount(1, $messages);
        $this->assertStringContainsString($userCode, $messages[0]['text']);
        $keyboard = json_decode($messages[0]['reply_markup'], true, flags: JSON_THROW_ON_ERROR);
        $button = $keyboard['inline_keyboard'][0][0];
        $this->assertSame("hs_ok_{$nonce}", $button['callback_data']);

        $this->postJson('/api/webhooks/telegram', [
            'callback_query' => [
                'id' => 'confirm-browser-login',
                'data' => "hs_ok_{$nonce}",
                'from' => ['id' => 123456, 'first_name' => 'Athanasius'],
                'message' => ['chat' => ['id' => 123456]],
            ],
        ])->assertOk();

        $this->assertStringContainsString('Signed in as Athanasius', $messages[1]['text']);
        $approvedKeyboard = json_decode($messages[1]['reply_markup'], true, flags: JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('url', $approvedKeyboard['inline_keyboard'][0][0]);
        $this->assertArrayNotHasKey('web_app', $approvedKeyboard['inline_keyboard'][0][0]);

        $this->postJson("/api/auth/telegram/handshake/{$nonce}")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.redirect_path', '/account/pets');
        $this->assertAuthenticatedAs($user);

        $this->postJson("/api/auth/telegram/handshake/{$nonce}")
            ->assertOk()
            ->assertJsonPath('data.status', 'expired');
    }

    public function test_handshake_cannot_be_claimed_by_a_different_session(): void
    {
        $user = User::factory()->create();
        $service = app(TelegramLoginHandshakeService::class);
        $handshake = $service->create('originating-session', 'en', '/account/pets');

        $this->assertTrue($service->approve($handshake['nonce'], $user));

        $this->postJson("/api/auth/telegram/handshake/{$handshake['nonce']}")
            ->assertOk()
            ->assertExactJson([
                'success' => true,
                'data' => ['status' => 'expired'],
            ]);

        $this->assertGuest();
        $this->assertSame('approved', Cache::get("telegram-handshake:{$handshake['nonce']}")['status']);
    }

    public function test_existing_user_handshake_requires_confirm_and_can_be_cancelled(): void
    {
        $messages = [];
        $this->mock(Telegram::class, function ($mock) use (&$messages): void {
            $mock->shouldReceive('setToken')->andReturnSelf();
            $mock->shouldReceive('sendMessage')->twice()->withArgs(function (array $params) use (&$messages): bool {
                $messages[] = $params;

                return true;
            });
        });

        $user = User::factory()->create(['telegram_user_id' => 654321]);
        $service = app(TelegramLoginHandshakeService::class);
        $handshake = $service->create('originating-session', 'en', null);

        $this->postJson('/api/webhooks/telegram', [
            'message' => [
                'text' => "/start hs_{$handshake['nonce']}",
                'chat' => ['id' => 654321],
                'from' => ['id' => 654321, 'first_name' => 'Owner'],
            ],
        ])->assertOk();

        $this->assertSame('pending', Cache::get("telegram-handshake:{$handshake['nonce']}")['status']);
        $this->assertStringContainsString($handshake['user_code'], $messages[0]['text']);

        $this->postJson('/api/webhooks/telegram', [
            'callback_query' => [
                'id' => 'forwarded-confirmation',
                'data' => "hs_ok_{$handshake['nonce']}",
                'from' => ['id' => 999999, 'first_name' => 'Forwarded'],
                'message' => ['chat' => ['id' => 654321]],
            ],
        ])->assertOk();

        $this->assertSame('pending', Cache::get("telegram-handshake:{$handshake['nonce']}")['status']);

        $this->postJson('/api/webhooks/telegram', [
            'callback_query' => [
                'id' => 'cancel-browser-login',
                'data' => "hs_no_{$handshake['nonce']}",
                'from' => ['id' => 654321, 'first_name' => 'Owner'],
                'message' => ['chat' => ['id' => 654321]],
            ],
        ])->assertOk();

        $this->assertNull(Cache::get("telegram-handshake:{$handshake['nonce']}"));
        $this->assertStringContainsString('cancelled', $messages[1]['text']);
        $this->assertSame(['status' => 'cancelled'], $service->claim($handshake['nonce'], 'originating-session'));
        $this->assertGuest();
        $this->assertSame($user->id, $user->fresh()->id);
    }

    public function test_expired_handshake_returns_expired(): void
    {
        $service = app(TelegramLoginHandshakeService::class);
        $handshake = $service->create('expired-session', null, null);

        $this->travel(301)->seconds();

        $this->assertSame(
            ['status' => 'expired'],
            $service->claim($handshake['nonce'], 'expired-session'),
        );
    }

    public function test_return_token_logs_in_and_redirects_and_stale_token_returns_to_login(): void
    {
        $user = User::factory()->create();
        $service = app(TelegramLoginHandshakeService::class);
        $returnToken = $service->issueReturnToken($user, '/account/pets');

        $this->get('/auth/telegram/return?'.http_build_query(['token' => $returnToken['token']]))
            ->assertRedirect('/account/pets');
        $this->assertAuthenticatedAs($user);

        auth()->logout();

        $this->get('/auth/telegram/return?'.http_build_query(['token' => $returnToken['token']]))
            ->assertRedirect('/login?via=telegram');
        $this->assertGuest();
    }

    public function test_handshake_locale_wins_and_is_persisted_for_a_new_user(): void
    {
        $messages = [];
        $this->mock(Telegram::class, function ($mock) use (&$messages): void {
            $mock->shouldReceive('setToken')->andReturnSelf();
            $mock->shouldReceive('sendMessage')->twice()->withArgs(function (array $params) use (&$messages): bool {
                $messages[] = $params;

                return true;
            });
        });

        $service = app(TelegramLoginHandshakeService::class);
        $handshake = $service->create('browser-session', 'vi', null);
        Cache::put('telegram-locale:987654', 'ru', now()->addDays(30));

        $this->postJson('/api/webhooks/telegram', [
            'message' => [
                'text' => "/start hs_{$handshake['nonce']}",
                'chat' => ['id' => 987654],
                'from' => ['id' => 987654, 'first_name' => 'Mai', 'language_code' => 'en-US'],
            ],
        ])->assertOk();

        $this->assertStringContainsString($handshake['user_code'], $messages[0]['text']);
        $this->assertStringContainsString('trình duyệt', $messages[0]['text']);
        $this->assertStringNotContainsString('lang_en', $messages[0]['reply_markup']);

        $this->postJson('/api/webhooks/telegram', [
            'callback_query' => [
                'id' => 'create-vietnamese-user',
                'data' => 'create_account',
                'from' => ['id' => 987654, 'first_name' => 'Mai', 'language_code' => 'en-US'],
                'message' => ['chat' => ['id' => 987654]],
            ],
        ])->assertOk();

        $user = User::where('telegram_user_id', 987654)->firstOrFail();
        $this->assertSame('vi', $user->locale);
        $this->assertSame('vi', Cache::get('telegram-locale:987654'));
        $this->assertStringContainsString('Đã đăng nhập', $messages[1]['text']);
    }

    public function test_telegram_language_code_is_normalized_and_skips_the_picker(): void
    {
        $messages = [];
        $this->mock(Telegram::class, function ($mock) use (&$messages): void {
            $mock->shouldReceive('setToken')->andReturnSelf();
            $mock->shouldReceive('sendMessage')->once()->withArgs(function (array $params) use (&$messages): bool {
                $messages[] = $params;

                return true;
            });
        });

        $this->postJson('/api/webhooks/telegram', [
            'message' => [
                'text' => '/start',
                'chat' => ['id' => 246810],
                'from' => ['id' => 246810, 'first_name' => 'Ирина', 'language_code' => 'ru-RU'],
            ],
        ])->assertOk();

        $this->assertStringContainsString('Добро пожаловать', $messages[0]['text']);
        $this->assertStringNotContainsString('lang_en', $messages[0]['reply_markup']);
        $this->assertSame('ru', Cache::get('telegram-locale:246810'));
    }

    public function test_all_web_app_buttons_and_chat_menu_use_plain_untokenized_urls(): void
    {
        $messages = [];
        $this->mock(Telegram::class, function ($mock) use (&$messages): void {
            $mock->shouldReceive('setToken')->andReturnSelf();
            $mock->shouldReceive('sendMessage')->once()->withArgs(function (array $params) use (&$messages): bool {
                $messages[] = $params;

                return true;
            });
        });

        User::factory()->create(['telegram_user_id' => 112233]);

        $this->postJson('/api/webhooks/telegram', [
            'message' => [
                'text' => '/start',
                'chat' => ['id' => 112233],
                'from' => ['id' => 112233, 'first_name' => 'Mini'],
            ],
        ])->assertOk();

        $keyboard = json_decode($messages[0]['reply_markup'], true, flags: JSON_THROW_ON_ERROR);
        $webAppUrl = $keyboard['inline_keyboard'][0][0]['web_app']['url'];
        $this->assertSame('https://app.example.test', $webAppUrl);
        $this->assertStringNotContainsString('tg_token', $webAppUrl);

        Http::assertSent(function ($request): bool {
            if (! str_contains($request->url(), '/setChatMenuButton')) {
                return false;
            }

            $menu = json_decode($request['menu_button'], true, flags: JSON_THROW_ON_ERROR);

            return ($menu['web_app']['url'] ?? null) === 'https://app.example.test'
                && ! str_contains($menu['web_app']['url'], 'tg_token');
        });
    }
}
