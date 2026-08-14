<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ErrorEvent;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use PHPUnit\Framework\Attributes\Test;
use ReflectionMethod;
use Tests\TestCase;

class StoreErrorEventTest extends TestCase
{
    #[Test]
    public function a_browser_error_can_be_ingested_without_authentication(): void
    {
        $response = $this->postJson('/api/error-events', [
            'message' => 'React crashed while rendering pet 42',
            'exception_class' => 'TypeError',
            'stack' => "TypeError: crashed\n    at PetCard (/assets/app.js:10:20)",
            'route' => '/pets/42',
            'method' => 'GET',
            'status_code' => 500,
            'app_version' => 'v1.18.2',
            'context' => ['component' => 'PetCard'],
            'occurred_at' => now()->subMinute()->toIso8601String(),
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['id', 'fingerprint']]);

        $this->assertDatabaseHas('error_events', [
            'source' => 'frontend',
            'message' => 'React crashed while rendering pet 42',
            'exception_class' => 'TypeError',
            'route' => '/pets/42',
            'user_id' => null,
        ]);
    }

    #[Test]
    public function a_session_user_is_associated_when_present(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/error-events', [
            'message' => 'Browser failure',
            'route' => '/settings',
        ])->assertCreated();

        $this->assertDatabaseHas('error_events', [
            'source' => 'frontend',
            'user_id' => $user->id,
        ]);
    }

    #[Test]
    public function a_future_browser_timestamp_is_accepted_and_clamped_to_now(): void
    {
        $now = now();

        $this->postJson('/api/error-events', [
            'message' => 'Browser clock is ahead',
            'route' => '/pets',
            'occurred_at' => $now->copy()->addMinutes(5)->toIso8601String(),
        ])->assertCreated();

        $event = ErrorEvent::query()->sole();
        $this->assertTrue($event->occurred_at->lessThanOrEqualTo($now));
    }

    #[Test]
    public function malformed_and_oversized_payloads_are_rejected(): void
    {
        $this->postJson('/api/error-events', [
            'message' => str_repeat('x', 2001),
            'route' => '/broken',
            'stack' => str_repeat('s', 20001),
            'context' => ['nested' => ['value' => str_repeat('c', 2001)]],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['message', 'stack', 'context']);

        $this->postJson('/api/error-events', [
            'message' => ['not a string'],
            'route' => null,
            'status_code' => 999,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['message', 'route', 'status_code']);

        $this->assertDatabaseCount('error_events', 0);
    }

    #[Test]
    public function the_public_ingest_endpoint_is_rate_limited(): void
    {
        RateLimiter::for('scoped-write-10-per-minute', fn (Request $request): Limit => Limit::perMinute(1)->by('error-event-test'));
        RateLimiter::clear('error-event-test');

        $payload = ['message' => 'Browser failure', 'route' => '/'];
        $this->postJson('/api/error-events', $payload)->assertCreated();
        $this->postJson('/api/error-events', $payload)->assertTooManyRequests();
    }

    /**
     * A browser that crashed before bootstrapping an XSRF cookie still has to be able
     * to report, so the ingest path is exempt from session CSRF. Laravel skips CSRF
     * validation entirely while running tests, so an HTTP request cannot prove this —
     * verified manually against `artisan serve`, where a request carrying a frontend
     * Origin and no token returned 419 before the exemption and 201 after. This asserts
     * the exemption itself so it cannot be dropped unnoticed.
     */
    #[Test]
    public function the_public_ingest_endpoint_is_exempt_from_session_csrf(): void
    {
        $middleware = app(ValidateCsrfToken::class);
        $inExceptArray = new ReflectionMethod($middleware, 'inExceptArray');

        $this->assertTrue(
            $inExceptArray->invoke($middleware, Request::create('/api/error-events', 'POST')),
            'POST /api/error-events must stay exempt from session CSRF.',
        );
    }
}
