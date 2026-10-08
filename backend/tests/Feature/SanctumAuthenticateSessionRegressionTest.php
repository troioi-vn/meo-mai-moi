<?php

namespace Tests\Feature;

use App\Models\User;
use ErrorException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SanctumAuthenticateSessionRegressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_upstream_null_password_storage_and_validation_raise_no_deprecations(): void
    {
        config(['sanctum.middleware.authenticate_session' => AuthenticateSession::class]);
        $user = User::factory()->create(['password' => null]);
        $this->actingAs($user, 'web')->withoutExceptionHandling();

        // Laravel suppresses deprecations in tests; capture vendor warnings directly.
        set_error_handler(function (int $severity, string $message, string $file, int $line): bool {
            if ($severity === E_DEPRECATED || $severity === E_USER_DEPRECATED) {
                throw new ErrorException($message, 0, $severity, $file, $line);
            }

            return false;
        });

        try {
            $this->withHeader('Origin', 'http://localhost')->getJson('/api/users/me')
                ->assertOk()->assertJsonPath('data.id', $user->id);
            $marker = session('password_hash_web');
            $this->assertIsString($marker);
            $this->assertSame(Auth::guard('web')->hashPasswordForCookie(null), $marker);

            $this->withSession(['password_hash_web' => $marker])->getJson('/api/users/me')
                ->assertOk()->assertJsonPath('data.id', $user->id);
        } finally {
            restore_error_handler();
        }
    }

    #[DataProvider('markerFormats')]
    public function test_password_change_logs_out_a_normal_session(string $format): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web');
        $oldHash = $user->getAuthPassword();
        $marker = $format === 'hmac' ? Auth::guard('web')->hashPasswordForCookie($oldHash) : $oldHash;
        $user->forceFill(['password' => Hash::make('changed-password')])->save();

        $this->withHeader('Origin', 'http://localhost')
            ->withSession(['password_hash_web' => $marker, 'session-sentinel' => 'present'])
            ->getJson('/api/users/me')->assertUnauthorized();

        $this->assertGuest('web');
        $this->assertNull(session('password_hash_web'));
        $this->assertNull(session('session-sentinel'));
    }

    #[DataProvider('markerFormats')]
    public function test_unchanged_password_keeps_a_normal_session(string $format): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web');
        $hash = $user->getAuthPassword();
        $hmac = Auth::guard('web')->hashPasswordForCookie($hash);

        $this->withHeader('Origin', 'http://localhost')
            ->withSession(['password_hash_web' => $format === 'hmac' ? $hmac : $hash])
            ->getJson('/api/users/me')->assertOk()->assertJsonPath('data.id', $user->id);

        $this->assertSame($hmac, session('password_hash_web'));
    }

    public static function markerFormats(): array
    {
        return [['hmac'], ['raw']];
    }

    public function test_impersonation_uses_the_configured_session_key_and_refreshes_the_marker(): void
    {
        config(['laravel-impersonate.session_key' => 'custom_impersonator']);
        $impersonator = User::factory()->create();
        $user = User::factory()->create();
        $this->actingAs($user, 'web');

        $this->withHeader('Origin', 'http://localhost')
            ->withSession(['custom_impersonator' => $impersonator->id, 'password_hash_web' => 'previous-user'])
            ->getJson('/api/users/me')->assertOk()->assertJsonPath('data.id', $user->id);

        $this->assertSame(Auth::guard('web')->hashPasswordForCookie($user->getAuthPassword()), session('password_hash_web'));
        $this->assertSame($impersonator->id, session('custom_impersonator'));
    }

    public function test_passwordless_session_clears_stale_markers_without_storing_a_replacement(): void
    {
        $user = User::factory()->create(['password' => null]);
        $this->actingAs($user, 'web');

        $this->withHeader('Origin', 'http://localhost')
            ->withSession(['password_hash_web' => 'previous-user'])
            ->getJson('/api/users/me')->assertOk();

        $this->assertNull(session('password_hash_web'));
    }
}
