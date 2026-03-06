<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Settings;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PruneApiRequestLogsCommandTest extends TestCase
{
    #[Test]
    public function it_prunes_api_request_logs_older_than_configured_retention_days(): void
    {
        Settings::set('api_request_logs_retention_days', '30');

        $now = Carbon::parse('2026-03-06 12:00:00');
        Carbon::setTestNow($now);

        DB::table('api_request_logs')->insert([
            [
                'user_id' => null,
                'method' => 'GET',
                'path' => 'api/version',
                'route_uri' => 'api/version',
                'status_code' => 200,
                'auth_mode' => 'none',
                'created_at' => $now->copy()->subDays(31),
                'updated_at' => $now->copy()->subDays(31),
            ],
            [
                'user_id' => null,
                'method' => 'GET',
                'path' => 'api/version',
                'route_uri' => 'api/version',
                'status_code' => 200,
                'auth_mode' => 'none',
                'created_at' => $now->copy()->subDays(2),
                'updated_at' => $now->copy()->subDays(2),
            ],
        ]);

        $this->artisan('api-logs:prune')->assertSuccessful();

        $this->assertDatabaseCount('api_request_logs', 1);

        Carbon::setTestNow();
    }
}
