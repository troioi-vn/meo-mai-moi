<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ErrorEvent;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReportErrorsCommandTest extends TestCase
{
    #[Test]
    public function json_reports_are_grouped_counted_and_filtered_by_the_requested_window(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-13 12:00:00 UTC'));

        ErrorEvent::factory()->count(2)->create([
            'fingerprint' => str_repeat('a', 64),
            'message' => 'Repeated backend failure',
            'app_version' => 'v1.0.0',
            'occurred_at' => now()->subHour(),
        ]);
        ErrorEvent::factory()->create([
            'source' => 'frontend',
            'fingerprint' => str_repeat('b', 64),
            'message' => 'Frontend failure',
            'app_version' => 'v1.1.0',
            'occurred_at' => now()->subHours(2),
        ]);
        ErrorEvent::factory()->create([
            'fingerprint' => str_repeat('c', 64),
            'occurred_at' => now()->subDays(2),
        ]);

        $exitCode = Artisan::call('errors:report', ['--json' => true, '--since' => '24h']);
        $report = json_decode(trim(Artisan::output()), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame(0, $exitCode);
        $this->assertSame(1, $report['schema_version']);
        $this->assertSame('24h', $report['filters']['since']);
        $this->assertSame(2, $report['group_count']);
        $this->assertSame(str_repeat('a', 64), $report['groups'][0]['fingerprint']);
        $this->assertSame(2, $report['groups'][0]['count']);
        $this->assertSame(['backend'], $report['groups'][0]['sources']);
        $this->assertSame(['v1.0.0'], $report['groups'][0]['app_versions']);
        $this->assertSame('Repeated backend failure', $report['groups'][0]['sample']['message']);
        $this->assertArrayHasKey('first_seen', $report['groups'][0]);
        $this->assertArrayHasKey('last_seen', $report['groups'][0]);

        $exitCode = Artisan::call('errors:report', [
            '--json' => true,
            '--since' => '24h',
            '--source' => 'frontend',
            '--limit' => '1',
        ]);
        $filteredReport = json_decode(trim(Artisan::output()), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame(0, $exitCode);
        $this->assertSame('frontend', $filteredReport['filters']['source']);
        $this->assertSame(1, $filteredReport['filters']['limit']);
        $this->assertSame(1, $filteredReport['group_count']);
        $this->assertSame([str_repeat('b', 64)], array_column($filteredReport['groups'], 'fingerprint'));

        Carbon::setTestNow();
    }
}
