<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * What the uptime probe asks: can the app serve requests and do its
 * background work? A route that answers without looking stays green while
 * the database is down or the queue has stopped, and a stopped queue makes
 * no 5xx: emails and notifications just stop going out.
 */
class HealthCheckService
{
    public const QUEUE_STALL_SECONDS = 15 * 60;

    public function __construct(private readonly QueueOperationsService $queue) {}

    /**
     * @return list<string> empty when healthy
     */
    public function problems(): array
    {
        try {
            DB::select('select 1');
        } catch (Throwable) {
            // Nothing below can be checked without the database.
            return ['database'];
        }

        // The queue can live on its own connection, so it can fail on its own.
        // An unreadable queue is reported the same way as a stalled one: either
        // way jobs are not going out.
        try {
            $waited = $this->queue->oldestWaitingJobAgeSeconds();
        } catch (Throwable) {
            return ['queue'];
        }
        if ($waited !== null && $waited > self::QUEUE_STALL_SECONDS) {
            return ['queue'];
        }

        return [];
    }
}
