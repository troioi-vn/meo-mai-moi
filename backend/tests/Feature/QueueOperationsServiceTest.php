<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\QueueOperationsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class QueueOperationsServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_queue_summaries_hide_payloads_and_redact_exception_secrets(): void
    {
        DB::table('jobs')->insert([
            'queue' => 'default',
            'payload' => json_encode([
                'displayName' => 'App\\Jobs\\TranslateContentField',
                'api_key' => 'payload-secret',
            ], JSON_THROW_ON_ERROR),
            'attempts' => 1,
            'reserved_at' => null,
            'available_at' => now()->timestamp,
            'created_at' => now()->subMinute()->timestamp,
        ]);
        DB::table('failed_jobs')->insert([
            'uuid' => '8c8cb333-44c8-4f6f-95ea-4d3c03a9ad95',
            'connection' => 'database',
            'queue' => 'default',
            'payload' => json_encode([
                'displayName' => 'App\\Jobs\\SendNotificationEmail',
                'token' => 'payload-secret',
            ], JSON_THROW_ON_ERROR),
            'exception' => 'RuntimeException: API key=visible-secret failed'."\nStack trace hidden",
            'failed_at' => now(),
        ]);

        $service = app(QueueOperationsService::class);
        $queued = $service->queuedJobs();
        $failed = $service->failedJobs();

        $this->assertSame(1, $service->queueDepth());
        $this->assertSame('TranslateContentField', $queued[0]['type']);
        $this->assertArrayNotHasKey('payload', $queued[0]);
        $this->assertSame('SendNotificationEmail', $failed[0]['type']);
        $this->assertStringContainsString('[redacted]', $failed[0]['exception']);
        $this->assertStringNotContainsString('visible-secret', $failed[0]['exception']);
        $this->assertArrayNotHasKey('payload', $failed[0]);
    }
}
