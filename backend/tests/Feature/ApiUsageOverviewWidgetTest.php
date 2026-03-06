<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Filament\Widgets\ApiUsageOverviewWidget;
use App\Models\ApiRequestLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiUsageOverviewWidgetTest extends TestCase
{
    use RefreshDatabase;

    public function test_widget_returns_expected_stats_shape(): void
    {
        $user = User::factory()->create();

        ApiRequestLog::query()->create([
            'user_id' => $user->id,
            'method' => 'GET',
            'path' => 'api/pets',
            'route_uri' => 'api/pets',
            'status_code' => 200,
            'auth_mode' => 'pat',
            'created_at' => now()->subHours(2),
            'updated_at' => now()->subHours(2),
        ]);

        ApiRequestLog::query()->create([
            'user_id' => $user->id,
            'method' => 'POST',
            'path' => 'api/pets',
            'route_uri' => 'api/pets',
            'status_code' => 422,
            'auth_mode' => 'session',
            'created_at' => now()->subHours(1),
            'updated_at' => now()->subHours(1),
        ]);

        $widget = new ApiUsageOverviewWidget;
        $reflection = new \ReflectionClass($widget);
        $method = $reflection->getMethod('getStats');
        $method->setAccessible(true);
        $stats = $method->invoke($widget);

        $this->assertCount(4, $stats);

        foreach ($stats as $stat) {
            $this->assertInstanceOf(\Filament\Widgets\StatsOverviewWidget\Stat::class, $stat);
        }
    }
}

