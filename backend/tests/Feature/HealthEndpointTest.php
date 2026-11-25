<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\HealthCheckService;
use App\Services\QueueOperationsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class HealthEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_healthy_app_reports_ok_in_the_shape_the_uptime_probe_matches(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data', ['status' => 'ok', 'problems' => []]);
        // Server Scratcher matches this substring, not the parsed JSON.
        $this->assertStringContainsString('"status":"ok"', $response->getContent());
    }

    public function test_a_due_job_waiting_past_the_threshold_degrades_health(): void
    {
        $this->insertJob(availableAt: now()->subMinutes(20)->timestamp);

        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonPath('data.status', 'degraded')
            ->assertJsonPath('data.problems', ['queue']);
    }

    public function test_recent_delayed_and_reserved_jobs_do_not_count_as_stalled(): void
    {
        $this->insertJob(availableAt: now()->subMinutes(5)->timestamp);
        $this->insertJob(availableAt: now()->addHour()->timestamp);
        $this->insertJob(availableAt: now()->subHour()->timestamp, reservedAt: now()->subMinute()->timestamp);

        $this->getJson('/api/health')->assertOk()->assertJsonPath('data.status', 'ok');
    }

    public function test_oldest_waiting_job_age_ignores_delayed_and_reserved_jobs(): void
    {
        $queue = app(QueueOperationsService::class);
        $this->assertNull($queue->oldestWaitingJobAgeSeconds());

        $this->insertJob(availableAt: now()->addHour()->timestamp);
        $this->insertJob(availableAt: now()->subHour()->timestamp, reservedAt: now()->timestamp);
        $this->assertNull($queue->oldestWaitingJobAgeSeconds());

        $this->insertJob(availableAt: now()->subMinutes(3)->timestamp);
        $this->assertEqualsWithDelta(180, $queue->oldestWaitingJobAgeSeconds(), 5);
    }

    public function test_unreachable_database_is_reported_without_checking_the_queue(): void
    {
        $queue = Mockery::mock(QueueOperationsService::class);
        $queue->shouldNotReceive('oldestWaitingJobAgeSeconds');
        $default = DB::getDefaultConnection();
        config(['database.connections.health_unreachable' => array_merge(
            config("database.connections.{$default}"),
            ['host' => '127.0.0.1', 'port' => 1],
        )]);

        DB::setDefaultConnection('health_unreachable');
        try {
            $problems = (new HealthCheckService($queue))->problems();
        } finally {
            DB::setDefaultConnection($default);
            DB::purge('health_unreachable');
        }

        $this->assertSame(['database'], $problems);
    }

    private function insertJob(int $availableAt, ?int $reservedAt = null): void
    {
        DB::table('jobs')->insert([
            'queue' => 'default',
            'payload' => json_encode(['displayName' => 'App\\Jobs\\SendNotificationEmail'], JSON_THROW_ON_ERROR),
            'attempts' => 0,
            'reserved_at' => $reservedAt,
            'available_at' => $availableAt,
            'created_at' => $availableAt,
        ]);
    }
}
