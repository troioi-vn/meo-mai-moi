<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Models\ApiRequestLog;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class ApiUsageOverviewWidget extends BaseWidget
{
    protected static ?int $sort = 4;

    protected int|string|array $columnSpan = 'full';

    protected function getStats(): array
    {
        $last24Hours = now()->subDay();

        $recentQuery = ApiRequestLog::query()->where('created_at', '>=', $last24Hours);
        $recentTotal = (clone $recentQuery)->count();
        $recentPat = (clone $recentQuery)->where('auth_mode', 'pat')->count();
        $recentUniqueUsers = (clone $recentQuery)->whereNotNull('user_id')->distinct('user_id')->count('user_id');
        $recentErrors = (clone $recentQuery)->where('status_code', '>=', 400)->count();

        $errorRate = $recentTotal > 0
            ? round($recentErrors / $recentTotal * 100, 1)
            : 0.0;

        $topRoute = (clone $recentQuery)
            ->selectRaw('COALESCE(route_uri, path) as endpoint, count(*) as total')
            ->groupByRaw('COALESCE(route_uri, path)')
            ->orderByDesc('total')
            ->first();

        $topRouteLabel = $topRoute === null ? 'n/a' : (string) $topRoute->endpoint;
        $topRouteCount = $topRoute === null ? 0 : (int) $topRoute->total;

        return [
            Stat::make('API Requests (24h)', number_format($recentTotal))
                ->description('All API requests in the last 24 hours')
                ->descriptionIcon('heroicon-m-chart-bar-square')
                ->chart($this->getDailyRequestChart())
                ->color('primary'),

            Stat::make('PAT Requests (24h)', number_format($recentPat))
                ->description('Requests authenticated via API keys')
                ->descriptionIcon('heroicon-m-key')
                ->color('info'),

            Stat::make('Active API Users (24h)', number_format($recentUniqueUsers))
                ->description('Unique authenticated users in API logs')
                ->descriptionIcon('heroicon-m-users')
                ->color('success'),

            Stat::make('Error Rate (24h)', $errorRate.'%')
                ->description("Top endpoint: {$topRouteLabel} ({$topRouteCount})")
                ->descriptionIcon('heroicon-m-exclamation-triangle')
                ->color($errorRate > 10 ? 'danger' : ($errorRate > 3 ? 'warning' : 'success')),
        ];
    }

    protected function getDailyRequestChart(): array
    {
        $start = now()->startOfDay()->subDays(6);
        $rows = ApiRequestLog::query()
            ->where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as day, count(*) as total')
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        $countsByDay = $rows->mapWithKeys(fn ($row): array => [(string) $row->day => (int) $row->total]);

        return collect(range(0, 6))
            ->map(function (int $dayOffset) use ($start, $countsByDay): int {
                $day = $start->copy()->addDays($dayOffset)->toDateString();

                return $countsByDay[$day] ?? 0;
            })
            ->all();
    }

    public static function canView(): bool
    {
        $user = auth()->user();

        return $user instanceof User
            && ($user->hasRole(['admin', 'super_admin']) || $user->can('manage_api_tokens'));
    }
}
