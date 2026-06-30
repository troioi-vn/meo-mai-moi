<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\Offline\IdempotencyResult;
use App\Services\Offline\IdempotencyService;
use App\Services\Offline\IdempotencyState;
use App\Services\Offline\InvalidIdempotencyKeyException;
use Illuminate\Support\Facades\Cache;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class IdempotencyServiceTest extends TestCase
{
    private IdempotencyService $service;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
        config([
            'offline.idempotency_ttl_seconds' => 3600,
            'offline.idempotency_key_max_length' => 128,
        ]);

        $this->service = app(IdempotencyService::class);
    }

    #[Test]
    public function it_normalizes_and_validates_idempotency_keys(): void
    {
        $this->assertSame(
            '550e8400-e29b-41d4-a716-446655440000',
            $this->service->normalizeKey('  550e8400-e29b-41d4-a716-446655440000  ')
        );
    }

    #[Test]
    public function it_rejects_empty_or_invalid_idempotency_keys(): void
    {
        $this->expectException(InvalidIdempotencyKeyException::class);
        $this->service->normalizeKey('   ');
    }

    #[Test]
    public function it_rejects_idempotency_keys_with_invalid_characters(): void
    {
        $this->expectException(InvalidIdempotencyKeyException::class);
        $this->service->normalizeKey('key with spaces');
    }

    #[Test]
    public function it_reserves_a_key_for_the_first_request(): void
    {
        $result = $this->service->begin(1, 'offline-op-1', 'create-weight:{"grams":4500}');

        $this->assertSame(IdempotencyState::Reserved, $result->state);
    }

    #[Test]
    public function it_stores_and_replays_a_completed_result_for_the_same_user_and_fingerprint(): void
    {
        $key = 'offline-op-2';
        $fingerprint = 'create-weight:{"grams":4500}';

        $this->service->begin(1, $key, $fingerprint);
        $this->service->complete(1, $key, 201, ['success' => true, 'data' => ['id' => 42]]);

        $replay = $this->service->begin(1, $key, $fingerprint);

        $this->assertSame(IdempotencyState::Replay, $replay->state);
        $this->assertSame(201, $replay->responseStatus);
        $this->assertSame(['success' => true, 'data' => ['id' => 42]], $replay->responsePayload);
    }

    #[Test]
    public function it_conflicts_when_the_same_key_is_reused_with_a_different_fingerprint_for_the_same_user(): void
    {
        $key = 'offline-op-3';

        $this->service->begin(1, $key, 'create-weight:{"grams":4500}');
        $this->service->complete(1, $key, 201, ['success' => true, 'data' => ['id' => 42]]);

        $conflict = $this->service->begin(1, $key, 'create-weight:{"grams":4600}');

        $this->assertSame(IdempotencyState::Conflict, $conflict->state);
    }

    #[Test]
    public function it_isolates_the_same_key_across_different_users(): void
    {
        $key = 'shared-key';
        $fingerprint = 'create-weight:{"grams":4500}';

        $firstUser = $this->service->begin(1, $key, $fingerprint);
        $this->service->complete(1, $key, 201, ['success' => true, 'data' => ['id' => 1]]);

        $secondUser = $this->service->begin(2, $key, $fingerprint);

        $this->assertSame(IdempotencyState::Reserved, $firstUser->state);
        $this->assertSame(IdempotencyState::Reserved, $secondUser->state);
    }

    #[Test]
    public function it_reports_in_progress_for_a_matching_unfinished_reservation(): void
    {
        $key = 'offline-op-4';
        $fingerprint = 'create-weight:{"grams":4500}';

        $this->service->begin(1, $key, $fingerprint);

        $inProgress = $this->service->begin(1, $key, $fingerprint);

        $this->assertSame(IdempotencyState::InProgress, $inProgress->state);
    }

    #[Test]
    public function it_allows_a_new_reservation_after_aborting_an_in_progress_record(): void
    {
        $key = 'offline-op-5';
        $fingerprint = 'create-weight:{"grams":4500}';

        $this->service->begin(1, $key, $fingerprint);
        $this->service->abort(1, $key);

        $reservedAgain = $this->service->begin(1, $key, $fingerprint);

        $this->assertSame(IdempotencyState::Reserved, $reservedAgain->state);
    }

    #[Test]
    public function it_allows_a_fresh_reservation_after_ttl_expiry(): void
    {
        config(['offline.idempotency_ttl_seconds' => 1]);

        $key = 'offline-op-6';
        $fingerprint = 'create-weight:{"grams":4500}';

        $this->service->begin(1, $key, $fingerprint);
        $this->service->complete(1, $key, 201, ['success' => true, 'data' => ['id' => 42]]);

        $this->travel(2)->seconds();

        $reservedAgain = $this->service->begin(1, $key, $fingerprint);

        $this->assertInstanceOf(IdempotencyResult::class, $reservedAgain);
        $this->assertSame(IdempotencyState::Reserved, $reservedAgain->state);
    }
}
