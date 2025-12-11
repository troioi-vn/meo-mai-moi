<?php

namespace Tests\Feature;

use App\Models\User;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Contracts\User as GoogleUser;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
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

    public function test_callback_creates_new_user_and_logs_in(): void
    {
        config(['app.frontend_url' => 'https://frontend.test']);

        $this->mockGoogleUser([
            'id' => 'google-123',
            'email' => 'new@example.com',
            'name' => 'Google Person',
            'avatar' => 'https://example.com/avatar.png',
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
        $this->assertEquals('https://example.com/avatar.png', $user->google_avatar);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_callback_updates_existing_google_user(): void
    {
        config(['app.frontend_url' => 'https://frontend.test']);

        $user = User::factory()->create([
            'google_id' => 'google-123',
            'google_token' => 'old-token',
            'google_refresh_token' => 'old-refresh',
            'google_avatar' => null,
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
        $this->assertEquals('https://example.com/new-avatar.png', $user->google_avatar);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_callback_redirects_when_email_exists_without_google(): void
    {
        config(['app.frontend_url' => 'https://frontend.test']);

        $existing = User::factory()->create([
            'email' => 'taken@example.com',
            'google_id' => null,
        ]);

        $this->mockGoogleUser([
            'id' => 'google-999',
            'email' => $existing->email,
            'name' => 'Another User',
        ]);

        $response = $this->get('/auth/google/callback');

        $response->assertRedirect('https://frontend.test/login?error=email_exists');
        $this->assertGuest();
        $this->assertEquals(1, User::count());
    }

    public function test_callback_redirects_when_google_returns_no_email(): void
    {
        config(['app.frontend_url' => 'https://frontend.test']);

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
