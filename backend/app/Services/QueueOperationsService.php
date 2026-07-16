<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Queue\Failed\FailedJobProviderInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use RuntimeException;

class QueueOperationsService
{
    /**
     * @return list<array{id: int, queue: string, type: string, attempts: int, reserved: bool, available_at: int, created_at: int}>
     */
    public function queuedJobs(int $limit = 100): array
    {
        $connection = $this->databaseConnection();
        $table = $this->queueTable();

        return DB::connection($connection)
            ->table($table)
            ->orderBy('created_at')
            ->limit($limit)
            ->get(['id', 'queue', 'payload', 'attempts', 'reserved_at', 'available_at', 'created_at'])
            ->map(fn (object $job): array => [
                'id' => (int) $job->id,
                'queue' => (string) $job->queue,
                'type' => $this->jobType((string) $job->payload),
                'attempts' => (int) $job->attempts,
                'reserved' => $job->reserved_at !== null,
                'available_at' => (int) $job->available_at,
                'created_at' => (int) $job->created_at,
            ])
            ->all();
    }

    /**
     * @return list<array{uuid: string, connection: string, queue: string, type: string, exception: string, failed_at: string}>
     */
    public function failedJobs(int $limit = 100): array
    {
        return DB::connection($this->failedDatabaseConnection())
            ->table((string) config('queue.failed.table', 'failed_jobs'))
            ->orderByDesc('failed_at')
            ->limit($limit)
            ->get(['uuid', 'connection', 'queue', 'payload', 'exception', 'failed_at'])
            ->map(fn (object $job): array => [
                'uuid' => (string) $job->uuid,
                'connection' => (string) $job->connection,
                'queue' => (string) $job->queue,
                'type' => $this->jobType((string) $job->payload),
                'exception' => $this->exceptionSummary((string) $job->exception),
                'failed_at' => (string) $job->failed_at,
            ])
            ->all();
    }

    public function queueDepth(): int
    {
        return DB::connection($this->databaseConnection())
            ->table($this->queueTable())
            ->count();
    }

    public function failedCount(): int
    {
        return DB::connection($this->failedDatabaseConnection())
            ->table((string) config('queue.failed.table', 'failed_jobs'))
            ->count();
    }

    public function retryFailed(string $uuid): bool
    {
        $provider = app(FailedJobProviderInterface::class);
        $job = $provider->find($uuid);
        if ($job === null) {
            return false;
        }

        Queue::connection((string) $job->connection)->pushRaw(
            (string) $job->payload,
            (string) $job->queue,
        );

        if (! $provider->forget($uuid)) {
            throw new RuntimeException('The job was queued, but its failed record could not be removed.');
        }

        return true;
    }

    public function deleteFailed(string $uuid): bool
    {
        return app(FailedJobProviderInterface::class)->forget($uuid);
    }

    private function databaseConnection(): ?string
    {
        $connection = config('queue.connections.database.connection');

        return is_string($connection) && $connection !== '' ? $connection : null;
    }

    private function queueTable(): string
    {
        return (string) config('queue.connections.database.table', 'jobs');
    }

    private function failedDatabaseConnection(): ?string
    {
        $connection = config('queue.failed.database');

        return is_string($connection) && $connection !== '' ? $connection : null;
    }

    private function jobType(string $payload): string
    {
        $decoded = json_decode($payload, true);
        if (! is_array($decoded)) {
            return 'Unknown job';
        }

        $type = $decoded['displayName'] ?? $decoded['job'] ?? null;

        return is_string($type) && $type !== '' ? class_basename($type) : 'Unknown job';
    }

    private function exceptionSummary(string $exception): string
    {
        $firstLine = strtok($exception, "\n");
        $summary = is_string($firstLine) ? $firstLine : 'No exception summary';
        $summary = preg_replace(
            [
                '/\b(Bearer)\s+\S+/i',
                '/\b(api[_ -]?key|token|password|secret)(\s*[:=]\s*)\S+/i',
            ],
            ['$1 [redacted]', '$1$2[redacted]'],
            $summary,
        ) ?? 'Exception details unavailable';

        return mb_substr($summary, 0, 500);
    }
}
