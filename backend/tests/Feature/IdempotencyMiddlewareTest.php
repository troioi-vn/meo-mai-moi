<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Middleware\HandleIdempotencyKey;
use App\Http\Support\IdempotencyRequestFingerprint;
use App\Models\User;
use App\Services\Offline\IdempotencyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class IdempotencyMiddlewareTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
        $this->app['auth']->forgetGuards();
        $this->registerTestRoutes();
    }

    #[Test]
    public function it_passes_through_requests_without_an_idempotency_key(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/testing/idempotency', [
            'value' => 'alpha',
        ]);

        $response->assertCreated()
            ->assertJson([
                'success' => true,
                'data' => ['echo' => 'alpha'],
            ]);
    }

    #[Test]
    public function it_reserves_and_stores_the_first_idempotent_request(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withHeader('Idempotency-Key', 'offline-op-1')
            ->postJson('/api/testing/idempotency', ['value' => 'alpha']);

        $response->assertCreated()
            ->assertJson([
                'success' => true,
                'data' => ['echo' => 'alpha'],
            ]);
    }

    #[Test]
    public function it_replays_the_stored_response_for_the_same_user_key_and_payload(): void
    {
        $user = User::factory()->create();
        $headers = ['Idempotency-Key' => 'offline-op-2'];
        $payload = ['value' => 'beta'];

        $first = $this->actingAs($user)
            ->withHeader('Idempotency-Key', $headers['Idempotency-Key'])
            ->postJson('/api/testing/idempotency', $payload);

        $second = $this->actingAs($user)
            ->withHeader('Idempotency-Key', $headers['Idempotency-Key'])
            ->postJson('/api/testing/idempotency', $payload);

        $first->assertCreated();
        $second->assertCreated()
            ->assertExactJson($first->json());
    }

    #[Test]
    public function it_conflicts_when_the_same_key_is_reused_with_a_different_payload(): void
    {
        $user = User::factory()->create();
        $key = 'offline-op-3';

        $this->actingAs($user)
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/testing/idempotency', ['value' => 'one'])
            ->assertCreated();

        $this->actingAs($user)
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/testing/idempotency', ['value' => 'two'])
            ->assertStatus(409)
            ->assertJson([
                'success' => false,
                'message' => __('messages.idempotency.conflict'),
            ]);
    }

    #[Test]
    public function it_rejects_unauthenticated_requests_that_include_an_idempotency_key(): void
    {
        $this->assertGuest();

        $this->withHeader('Idempotency-Key', 'offline-op-4')
            ->postJson('/api/testing/idempotency', ['value' => 'alpha'])
            ->assertUnauthorized()
            ->assertJson([
                'success' => false,
                'message' => __('messages.idempotency.unauthenticated'),
            ]);
    }

    #[Test]
    public function it_returns_too_early_while_a_matching_request_is_still_in_progress(): void
    {
        $user = User::factory()->create();
        $key = 'offline-op-5';
        $request = Request::create('/api/testing/idempotency', 'POST', server: [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
        ], content: json_encode(['value' => 'pending'], JSON_THROW_ON_ERROR));
        $fingerprint = IdempotencyRequestFingerprint::forRequest($request);

        app(IdempotencyService::class)->begin($user->id, $key, $fingerprint);

        $this->actingAs($user)
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/testing/idempotency', ['value' => 'pending'])
            ->assertStatus(425)
            ->assertJson([
                'success' => false,
                'message' => __('messages.idempotency.in_progress'),
            ]);
    }

    #[Test]
    public function it_replays_no_content_responses_with_an_empty_body(): void
    {
        $user = User::factory()->create();
        $key = 'offline-op-6';

        $first = $this->actingAs($user)
            ->withHeader('Idempotency-Key', $key)
            ->deleteJson('/api/testing/idempotency-no-content');

        $second = $this->actingAs($user)
            ->withHeader('Idempotency-Key', $key)
            ->deleteJson('/api/testing/idempotency-no-content');

        $first->assertNoContent();
        $second->assertNoContent();
        $this->assertSame('', $second->getContent());
    }

    private function registerTestRoutes(): void
    {
        Route::middleware(['api', HandleIdempotencyKey::class, 'auth:sanctum'])
            ->post('/api/testing/idempotency', function (Request $request) {
                return response()->json([
                    'success' => true,
                    'data' => ['echo' => $request->input('value')],
                ], 201);
            });

        Route::middleware(['api', HandleIdempotencyKey::class, 'auth:sanctum'])
            ->delete('/api/testing/idempotency-no-content', function () {
                return response()->noContent();
            });
    }
}
