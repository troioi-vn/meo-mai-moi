<?php

declare(strict_types=1);

namespace App\Services\Demo;

use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class DemoLoginTokenService
{
    public function __construct(
        private readonly CacheRepository $cache,
    ) {}

    /**
     * @return array{token: string, expires_at: Carbon}
     */
    public function issue(?string $issuedFor = null): array
    {
        $token = Str::random(64);
        $expiresAt = now()->addSeconds($this->ttlSeconds());

        $this->cache->put(
            $this->cacheKey($token),
            [
                'issued_for' => $issuedFor,
                'issued_at' => now()->toIso8601String(),
            ],
            $expiresAt,
        );

        return [
            'token' => $token,
            'expires_at' => $expiresAt,
        ];
    }

    public function consume(string $token): bool
    {
        if ($token === '') {
            return false;
        }

        return $this->cache->pull($this->cacheKey($token)) !== null;
    }

    public function ttlSeconds(): int
    {
        return max(1, (int) config('demo.token_ttl_seconds', 120));
    }

    private function cacheKey(string $token): string
    {
        return 'demo-login-token:'.hash('sha256', $token);
    }
}
