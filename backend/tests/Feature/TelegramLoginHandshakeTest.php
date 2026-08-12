<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\Settings;
use App\Models\User;
use App\Services\Telegram\TelegramLoginLinkService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use NotificationChannels\Telegram\Telegram;
use Tests\TestCase;

class TelegramLoginHandshakeTest extends TestCase
{
    use RefreshDatabase;

    /** @var list<array<string, mixed>> */
    private array $messages = [];

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('telegram.user_bot.username', 'meo_test_bot');
        config()->set('telegram.user_bot.token', 'test-token');
        config()->set('app.url', 'https://app.example.test');
        config()->set('app.frontend_url', 'https://app.example.test');
        Http::fake();

        $this->mock(Telegram::class, function ($mock): void {
            $mock->shouldReceive('setToken')->andReturnSelf();
            $mock->shouldReceive('sendMessage')->withArgs(function (array $params): bool {
                $this->messages[] = $params;

                return true;
            });
        });
    }

    public function test_new_telegram_user_is_created_and_receives_two_login_options(): void
    {
        $response = $this->postJson('/api/auth/telegram/handshake', [
            'locale' => 'vi',
            'redirect_path' => '/account/pets',
        ])->assertOk();

        $nonce = $response->json('data.nonce');
        $this->assertIsString($nonce);
        $response->assertJsonMissingPath('data.user_code');
        $response->assertJsonPath('data.deep_link', "https://t.me/meo_test_bot?start=hs_{$nonce}");

        $this->start("hs_{$nonce}", 123456, 'Mai', 'vi-VN');

        $user = User::where('telegram_user_id', 123456)->firstOrFail();
        $this->assertSame('vi', $user->locale);
        $this->assertStringContainsString('Rất vui', $this->messages[0]['text']);
        $this->assertLoginOptions($this->messages[0], '/account/pets');
    }

    public function test_existing_user_receives_welcome_back_without_confirmation_keyboard(): void
    {
        User::factory()->create(['name' => 'Athanasius', 'telegram_user_id' => 123456]);
        $this->start(null, 123456, 'Athanasius');

        $this->assertStringContainsString('Welcome back, Athanasius', $this->messages[0]['text']);
        $this->assertLoginOptions($this->messages[0], null);
        $this->assertStringNotContainsString('callback_data', $this->messages[0]['reply_markup']);
    }

    public function test_return_token_logs_in_once_and_expired_links_expose_no_referrer_policy(): void
    {
        $user = User::factory()->create();
        $token = app(TelegramLoginLinkService::class)->issueReturnToken($user, '/account/pets')['token'];

        $this->get('/auth/telegram/return?token='.$token)
            ->assertRedirect('/account/pets')
            ->assertHeader('Referrer-Policy', 'no-referrer');
        $this->assertAuthenticatedAs($user);

        auth()->logout();
        $this->get('/auth/telegram/return?token='.$token)
            ->assertRedirect('/login?via=telegram&expired=telegram')
            ->assertHeader('Referrer-Policy', 'no-referrer');
        $this->assertGuest();
    }

    public function test_handshake_invitation_code_allows_signup_when_invite_only_is_enabled(): void
    {
        $invitation = Invitation::factory()->create();
        Settings::set('invite_only_enabled', 'true');
        $handshake = app(TelegramLoginLinkService::class)->create('en', '/', $invitation->code);

        $this->start("hs_{$handshake['nonce']}", 654321, 'Invited');

        $this->assertDatabaseHas('users', ['telegram_user_id' => 654321]);
        $this->assertLoginOptions($this->messages[0], '/');
    }

    public function test_gpt_login_context_is_preserved_in_both_login_options(): void
    {
        User::factory()->create(['telegram_user_id' => 112233]);
        Cache::put(
            'telegram-login-redirect:redirecttoken',
            '/gpt-connect?session_id=session-123&session_sig=sig-456',
            now()->addMinutes(30),
        );

        $this->start('login_redirecttoken', 112233, 'GPT user');

        $this->assertLoginOptions($this->messages[0], '/gpt-connect?session_id=session-123&session_sig=sig-456');
        $keyboard = json_decode((string) $this->messages[0]['reply_markup'], true, flags: JSON_THROW_ON_ERROR);
        $this->get((string) $keyboard['inline_keyboard'][0][0]['url'])
            ->assertRedirect('/gpt-connect?session_id=session-123&session_sig=sig-456');
    }

    public function test_bare_start_never_claims_an_account_through_a_null_link_token(): void
    {
        // `where('telegram_link_token', null)` compiles to `whereNull`, so a payload-less
        // /start must not reach the settings-link lookup at all.
        $victim = User::factory()->create([
            'telegram_link_token' => null,
            'telegram_link_token_expires_at' => now()->addMinutes(30),
        ]);

        $this->start(null, 999999, 'Stranger');

        $victim->refresh();
        $this->assertNull($victim->telegram_chat_id);
        $this->assertNull($victim->telegram_user_id);
        $this->assertDatabaseHas('users', ['telegram_user_id' => 999999]);
    }

    public function test_disconnected_account_is_relinked_rather_than_recreated(): void
    {
        // Disconnecting nulls the identity columns but keeps the generated address, and the
        // address is unique — so a rebuilt account would collide instead of signing in.
        $orphan = User::factory()->create([
            'email' => 'telegram_999000111@telegram.meo-mai-moi.local',
            'telegram_user_id' => null,
            'telegram_chat_id' => null,
        ]);

        $this->start(null, 999000111, 'Reconnecting user');

        $orphan->refresh();
        $this->assertSame(999000111, $orphan->telegram_user_id);
        $this->assertSame('999000111', (string) $orphan->telegram_chat_id);
        $this->assertSame(1, User::where('email', $orphan->email)->count());
        $this->assertLoginOptions($this->messages[0], null);
    }

    public function test_settings_link_flow_offers_the_same_two_login_options(): void
    {
        $user = User::factory()->create([
            'telegram_link_token' => 'settings-link-token',
            'telegram_link_token_expires_at' => now()->addMinutes(30),
        ]);

        $this->start('settings-link-token', 445566, 'Linking user');

        $this->assertStringContainsString('Telegram account linked!', $this->messages[0]['text']);
        $this->assertLoginOptions($this->messages[0], null);
        $this->assertSame($user->id, User::where('telegram_user_id', 445566)->firstOrFail()->id);
    }

    public function test_linked_user_locale_outranks_the_telegram_client_language(): void
    {
        User::factory()->create([
            'name' => 'Mai',
            'locale' => 'vi',
            'telegram_user_id' => 445566,
        ]);

        $this->start(null, 445566, 'Mai', 'en');

        $this->assertStringContainsString('Chào mừng trở lại, Mai', $this->messages[0]['text']);
    }

    /** @param array<string, mixed> $message */
    private function assertLoginOptions(array $message, ?string $redirectPath): void
    {
        $keyboard = json_decode((string) $message['reply_markup'], true, flags: JSON_THROW_ON_ERROR);
        $buttons = $keyboard['inline_keyboard'][0];
        $this->assertCount(2, $buttons);
        $this->assertArrayHasKey('url', $buttons[0]);
        $this->assertStringContainsString('/auth/telegram/return?token=', $buttons[0]['url']);

        // The same URL is repeated as a text link, which the client may treat differently.
        $this->assertStringContainsString('<a href="'.$buttons[0]['url'].'">', $message['text']);
        $this->assertArrayHasKey('web_app', $buttons[1]);
        $this->assertSame('https://app.example.test'.($redirectPath ?? ''), $buttons[1]['web_app']['url']);
        $this->assertStringNotContainsString('token=', $buttons[1]['web_app']['url']);
    }

    private function start(?string $param, int $telegramUserId, string $name, ?string $languageCode = null): void
    {
        $from = ['id' => $telegramUserId, 'first_name' => $name];
        if ($languageCode !== null) {
            $from['language_code'] = $languageCode;
        }

        $this->postJson('/api/webhooks/telegram', [
            'message' => [
                'text' => '/start'.($param === null ? '' : " {$param}"),
                'chat' => ['id' => $telegramUserId],
                'from' => $from,
            ],
        ])->assertOk();
    }
}
