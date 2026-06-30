<?php

declare(strict_types=1);

namespace App\Services\Offline;

use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Support\Carbon;

/**
 * @phpstan-type IdempotencyRecord array{
 *     user_id: int,
 *     fingerprint: string,
 *     status: 'in_progress'|'completed',
 *     response_status?: int,
 *     response_payload?: array<string, mixed>,
 *     reserved_at: string,
 *     completed_at?: string,
 * }
 */
class IdempotencyService
{
    public function __construct(
        private readonly CacheRepository $cache,
    ) {}

    public function normalizeKey(string $key): string
    {
        $normalized = trim($key);
        $maxLength = max(1, (int) config('offline.idempotency_key_max_length', 128));

        if ($normalized === '' || strlen($normalized) > $maxLength) {
            throw new InvalidIdempotencyKeyException('Idempotency key must be a non-empty string within the configured length limit.');
        }

        if (! preg_match('/^[A-Za-z0-9_-]+$/', $normalized)) {
            throw new InvalidIdempotencyKeyException('Idempotency key contains invalid characters.');
        }

        return $normalized;
    }

    public function begin(int $userId, string $key, string $fingerprint): IdempotencyResult
    {
        $normalizedKey = $this->normalizeKey($key);
        $fingerprintHash = $this->hashFingerprint($fingerprint);
        $cacheKey = $this->cacheKey($userId, $normalizedKey);

        $existing = $this->cache->get($cacheKey);
        if (is_array($existing)) {
            return $this->resolveExistingRecord($existing, $userId, $fingerprintHash);
        }

        /** @var IdempotencyRecord $record */
        $record = [
            'user_id' => $userId,
            'fingerprint' => $fingerprintHash,
            'status' => 'in_progress',
            'reserved_at' => now()->toIso8601String(),
        ];

        if ($this->cache->add($cacheKey, $record, $this->expiresAt())) {
            return IdempotencyResult::reserved();
        }

        $raced = $this->cache->get($cacheKey);
        if (! is_array($raced)) {
            return IdempotencyResult::inProgress();
        }

        return $this->resolveExistingRecord($raced, $userId, $fingerprintHash);
    }

    /**
     * @param  array<string, mixed>  $responsePayload
     */
    public function complete(int $userId, string $key, int $responseStatus, array $responsePayload): void
    {
        $normalizedKey = $this->normalizeKey($key);
        $cacheKey = $this->cacheKey($userId, $normalizedKey);
        $existing = $this->cache->get($cacheKey);

        if (! is_array($existing) || ($existing['user_id'] ?? null) !== $userId) {
            throw new InvalidIdempotencyKeyException('Cannot complete an idempotency record that was not reserved for this user.');
        }

        if (($existing['status'] ?? '') === 'completed') {
            return;
        }

        $completed = [
            ...$existing,
            'status' => 'completed',
            'response_status' => $responseStatus,
            'response_payload' => $responsePayload,
            'completed_at' => now()->toIso8601String(),
        ];

        $this->cache->put($cacheKey, $completed, $this->expiresAt());
    }

    public function abort(int $userId, string $key): void
    {
        $normalizedKey = $this->normalizeKey($key);
        $cacheKey = $this->cacheKey($userId, $normalizedKey);
        $existing = $this->cache->get($cacheKey);

        if (! is_array($existing) || ($existing['user_id'] ?? null) !== $userId) {
            return;
        }

        if (($existing['status'] ?? '') === 'completed') {
            return;
        }

        $this->cache->forget($cacheKey);
    }

    public function ttlSeconds(): int
    {
        return max(1, (int) config('offline.idempotency_ttl_seconds', 86_400));
    }

    public function hashFingerprint(string $fingerprint): string
    {
        return hash('sha256', $fingerprint);
    }

    /**
     * @param  array<string, mixed>  $existing
     */
    private function resolveExistingRecord(array $existing, int $userId, string $fingerprintHash): IdempotencyResult
    {
        if (($existing['user_id'] ?? null) !== $userId) {
            return IdempotencyResult::conflict();
        }

        if (($existing['fingerprint'] ?? '') !== $fingerprintHash) {
            return IdempotencyResult::conflict();
        }

        if (($existing['status'] ?? '') === 'completed') {
            return IdempotencyResult::replay(
                (int) ($existing['response_status'] ?? 200),
                (array) ($existing['response_payload'] ?? []),
            );
        }

        return IdempotencyResult::inProgress();
    }

    private function cacheKey(int $userId, string $normalizedKey): string
    {
        $prefix = (string) config('offline.idempotency_key_prefix', 'offline-idempotency');

        return $prefix.':'.hash('sha256', $userId.':'.$normalizedKey);
    }

    private function expiresAt(): Carbon
    {
        return now()->addSeconds($this->ttlSeconds());
    }
}
