<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Illuminate\Cache\RateLimiter;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Cache;

/**
 * Rate limiting for /api/health that does not need PostgreSQL. The default
 * limiter keeps its counters in the default cache store, which in production
 * is the database, so a database outage would turn the health check into a
 * 500 before it could report the outage. Counters here live in the file store
 * of each backend container. Named limiters belong to the shared RateLimiter,
 * so routes pass numbers: `ThrottleHealthCheck::class.':60,1'`.
 */
class ThrottleHealthCheck extends ThrottleRequests
{
    public function __construct()
    {
        parent::__construct(new RateLimiter(Cache::store('file')));
    }
}
