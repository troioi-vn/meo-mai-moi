<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ErrorEvent;
use App\Models\Settings;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PruneErrorEventsCommandTest extends TestCase
{
    #[Test]
    public function it_prunes_error_events_older_than_the_configured_retention(): void
    {
        Settings::set('error_events_retention_days', '30');
        Carbon::setTestNow(Carbon::parse('2026-08-13 12:00:00 UTC'));

        ErrorEvent::factory()->create([
            'created_at' => now()->subDays(31),
            'updated_at' => now()->subDays(31),
            'occurred_at' => now()->subDays(31),
        ]);
        ErrorEvent::factory()->create([
            'created_at' => now()->subDays(2),
            'updated_at' => now()->subDays(2),
            'occurred_at' => now()->subDays(2),
        ]);

        $this->artisan('errors:prune')->assertSuccessful();
        $this->assertDatabaseCount('error_events', 1);

        Carbon::setTestNow();
    }

    #[Test]
    public function pruning_is_registered_in_the_scheduler(): void
    {
        $this->artisan('schedule:list')
            ->expectsOutputToContain('errors:prune')
            ->assertSuccessful();
    }
}
