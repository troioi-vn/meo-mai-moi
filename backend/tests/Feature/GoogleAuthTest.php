<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Settings;
use App\Models\WaitlistEntry;
use App\Models\Invitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\RedirectResponse;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Contracts\User as GoogleUser;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.frontend_url' => 'https://frontend.test']);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_redirect_route_stores_redirect_and_sends_to_google(): void
    {
        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('scopes')->once()->with(['openid', 'profile', 'email'])->andReturnSelf();
        $provider->shouldReceive('redirect')
            ->once()
            ->andReturn(new RedirectResponse('https://accounts.google.com/o/oauth2/auth'));

        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);

        $response = $this->get('/auth/google/redirect?redirect=/account/pets');

        $response->assertRedirect('https://accounts.google.com/o/oauth2/auth');
        $this->assertEquals('/account/pets', session('google_redirect'));
    }

    public function test_redirect_route_stores_invitation_code(): void
    {
        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('scopes')->andReturnSelf();
        $provider->shouldReceive('redirect')->andReturn(new RedirectResponse('https://google.com'));
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $this->get('/auth/google/redirect?invitation_code=CODE123');

        $this->assertEquals('CODE123', session('google_invitation_code'));
    }

    public function test_callback_creates_new_user_and_logs_in(): void
    {
        $tinyPng = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3Z1WQAAAAASUVORK5CYII='
        );

        Http::fake([
            'lh3.googleusercontent.com/*' => Http::response($tinyPng, 200, ['Content-Type' => 'image/png']),
        ]);

        $this->mockGoogleUser([
            'id' => 'google-123',
            'email' => 'new@example.com',
            'name' => 'Google Person',
            'avatar' => 'https://lh3.googleusercontent.com/avatar.png',
            'token' => 'token-abc',
            'refresh_token' => 'refresh-token-xyz',
        ]);

        $response = $this->withSession(['google_redirect' => '/account/pets'])->get('/auth/google/callback');

        $response->assertRedirect('https://frontend.test/account/pets');

        $user = User::where('email', 'new@example.com')->first();
        $this->assertNotNull($user);
        $this->assertAuthenticatedAs($user);
        $this->assertNull($user->password);
        $this->assertEquals('google-123', $user->google_id);
        $this->assertEquals('token-abc', $user->google_token);
        $this->assertEquals('refresh-token-xyz', $user->google_refresh_token);
        $this->assertNotNull($user->avatar_url);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_callback_updates_existing_google_user(): void
    {
        $user = User::factory()->create([
            'google_id' => 'google-123',
            'google_token' => 'old-token',
            'google_refresh_token' => 'old-refresh',
            'email_verified_at' => null,
        ]);

        $this->mockGoogleUser([
            'id' => 'google-123',
            'email' => $user->email,
            'name' => $user->name,
            'avatar' => 'https://example.com/new-avatar.png',
            'token' => 'new-token',
            'refresh_token' => 'new-refresh',
        ]);

        $response = $this->get('/auth/google/callback');

        $response->assertRedirect('https://frontend.test/account/pets');

        $user->refresh();
        $this->assertAuthenticatedAs($user);
        $this->assertEquals('new-token', $user->google_token);
        $this->assertEquals('new-refresh', $user->google_refresh_token);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_callback_links_google_to_existing_email_user(): void
    {
        $existing = User::factory()->create([
            'email' => 'taken@example.com',
            'google_id' => null,
            'google_token' => null,
            'google_refresh_token' => null,
            'email_verified_at' => null,
        ]);

        $this->mockGoogleUser([
            'id' => 'google-999',
            'email' => $existing->email,
            'name' => 'Another User',
            'avatar' => 'https://example.com/linked-avatar.png',
            'token' => 'linked-token',
            'refresh_token' => 'linked-refresh',
        ]);

        $response = $this->get('/auth/google/callback');

        $response->assertRedirect('https://frontend.test/account/pets');

        $existing->refresh();
        $this->assertAuthenticatedAs($existing);
        $this->assertEquals(1, User::count()); // No new user created
        $this->assertEquals('google-999', $existing->google_id);
        $this->assertEquals('linked-token', $existing->google_token);
        $this->assertEquals('linked-refresh', $existing->google_refresh_token);
        $this->assertNotNull($existing->email_verified_at); // Now verified via Google
    }

    public function test_callback_redirects_when_google_returns_no_email(): void
    {
        $this->mockGoogleUser([
            'id' => 'google-no-email',
            'email' => null,
            'name' => 'No Email User',
        ]);

        $response = $this->get('/auth/google/callback');

        $response->assertRedirect('https://frontend.test/login?error=missing_email');
        $this->assertGuest();
        $this->assertEquals(0, User::count());
    }

    public function test_callback_adds_to_waitlist_when_invite_only_enabled(): void
    {
        Settings::set('invite_only_enabled', 'true');

        $this->mockGoogleUser([
            'email' => 'waitlist@example.com',
        ]);

        $response = $this->get('/auth/google/callback');

        $response->assertRedirect('https://frontend.test/login?status=added_to_waitlist');
        $this->assertDatabaseHas('waitlist_entries', ['email' => 'waitlist@example.com']);
        $this->assertGuest();
    }

    public function test_callback_shows_already_on_waitlist_error(): void
    {
        Settings::set('invite_only_enabled', 'true');
        WaitlistEntry::create(['email' => 'already@example.com', 'status' => 'pending']);

        $this->mockGoogleUser([
            'email' => 'already@example.com',
        ]);

        $response = $this->get('/auth/google/callback');

        $response->assertRedirect('https://frontend.test/login?error=already_on_waitlist');
        $this->assertGuest();
    }

    public function test_callback_accepts_invitation_when_valid_code_provided(): void
    {
        Settings::set('invite_only_enabled', 'true');

        $inviter = User::factory()->create();
        $invitation = Invitation::create([
            'code' => 'VALID_CODE',
            'inviter_user_id' => $inviter->id,
            'status' => 'pending',
        ]);

        $this->mockGoogleUser([
            'email' => 'invited@example.com',
        ]);

        $response = $this->withSession(['google_invitation_code' => 'VALID_CODE'])
            ->get('/auth/google/callback');

        $response->assertRedirect('https://frontend.test/account/pets');

        $user = User::where('email', 'invited@example.com')->first();
        $this->assertNotNull($user);
        $this->assertAuthenticatedAs($user);

        $invitation->refresh();
        $this->assertEquals('accepted', $invitation->status);
        $this->assertEquals($user->id, $invitation->recipient_user_id);
    }

    private function mockGoogleUser(array $overrides = []): void
    {
        $googleUser = Mockery::mock(GoogleUser::class);
        $googleUser->shouldReceive('getId')->andReturn($overrides['id'] ?? 'google-id');
        $googleUser->shouldReceive('getEmail')->andReturn(
            array_key_exists('email', $overrides) ? $overrides['email'] : 'user@example.com'
        );
        $googleUser->shouldReceive('getName')->andReturn($overrides['name'] ?? 'Google User');
        $googleUser->shouldReceive('getAvatar')->andReturn($overrides['avatar'] ?? 'https://example.com/avatar.png');
        $googleUser->token = $overrides['token'] ?? 'token-123';
        $googleUser->refreshToken = $overrides['refresh_token'] ?? 'refresh-token-123';

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->andReturn($googleUser);

        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);
    }
}
