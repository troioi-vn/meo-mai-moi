<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Models\EmailConfiguration;
use App\Models\Notification;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\DB;

class NotificationStatsWidget extends BaseWidget
{
    protected static ?int $sort = 2;

    protected int|string|array $columnSpan = 'full';

    protected function getStats(): array
    {
        // Basic notification stats
        $totalNotifications = Notification::count();
        $deliveredNotifications = Notification::delivered()->count();
        $pendingNotifications = Notification::pending()->count();

        // Email-specific stats (last 24 hours)
        $last24Hours = now()->subDay();
        $emailsSent24h = Notification::where('created_at', '>=', $last24Hours)
            ->delivered()
            ->count();
        $emailsFailed24h = Notification::where('created_at', '>=', $last24Hours)
            ->failed()
            ->count();

        // Calculate rates
        $deliveryRate = $totalNotifications > 0
            ? round($deliveredNotifications / $totalNotifications * 100, 1)
            : 0;

        $engagementRate = $deliveredNotifications > 0
            ? round(Notification::read()->count() / $deliveredNotifications * 100, 1)
            : 0;

        // Email configuration status
        $activeEmailConfigs = EmailConfiguration::active()->count();
        $totalEmailConfigs = EmailConfiguration::count();

        // Queue status for email jobs
        $queuedEmailJobs = $this->getQueuedEmailJobsCount();

        // Recent failure rate (last 24h)
        $recentTotal = $emailsSent24h + $emailsFailed24h;
        $recentFailureRate = $recentTotal > 0
            ? round($emailsFailed24h / $recentTotal * 100, 1)
            : 0;

        return [
            Stat::make('Email Delivery Rate', $deliveryRate.'%')
                ->description('Overall email delivery success rate')
                ->descriptionIcon('heroicon-m-paper-airplane')
                ->color($deliveryRate >= 95 ? 'success' : ($deliveryRate >= 85 ? 'warning' : 'danger'))
                ->chart($this->getDeliveryRateChart()),

            Stat::make('Emails Sent (24h)', $emailsSent24h)
                ->description('Successfully delivered in last 24 hours')
                ->descriptionIcon('heroicon-m-check-circle')
                ->color('success'),

            Stat::make('Email Failures (24h)', $emailsFailed24h)
                ->description('Failed deliveries in last 24 hours')
                ->descriptionIcon('heroicon-m-exclamation-triangle')
                ->color($emailsFailed24h > 0 ? 'danger' : 'success'),

            Stat::make('Recent Failure Rate', $recentFailureRate.'%')
                ->description('Failure rate in last 24 hours')
                ->descriptionIcon('heroicon-m-chart-bar')
                ->color($recentFailureRate <= 5 ? 'success' : ($recentFailureRate <= 15 ? 'warning' : 'danger')),

            Stat::make('Active Email Configs', $activeEmailConfigs.'/'.$totalEmailConfigs)
                ->description('Email configurations available')
                ->descriptionIcon('heroicon-m-cog-6-tooth')
                ->color($activeEmailConfigs > 0 ? 'success' : 'danger'),

            Stat::make('Queued Email Jobs', $queuedEmailJobs)
                ->description('Emails waiting to be sent')
                ->descriptionIcon('heroicon-m-queue-list')
                ->color($queuedEmailJobs > 100 ? 'warning' : 'primary'),

            Stat::make('Engagement Rate', $engagementRate.'%')
                ->description('Read rate of delivered emails')
                ->descriptionIcon('heroicon-m-eye')
                ->color($engagementRate >= 70 ? 'success' : ($engagementRate >= 50 ? 'warning' : 'danger')),

            Stat::make('Pending Deliveries', $pendingNotifications)
                ->description('Notifications awaiting delivery')
                ->descriptionIcon('heroicon-m-clock')
                ->color($pendingNotifications > 20 ? 'warning' : 'primary'),
        ];
    }

    protected function getDeliveryRateChart(): array
    {
        // Get delivery rates for the last 7 days
        $data = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->startOfDay();
            $endDate = $date->copy()->endOfDay();

            $delivered = Notification::whereBetween('created_at', [$date, $endDate])
                ->delivered()
                ->count();
            $total = Notification::whereBetween('created_at', [$date, $endDate])
                ->count();

            $rate = $total > 0 ? round($delivered / $total * 100, 1) : 0;
            $data[] = $rate;
        }

        return $data;
    }

    protected function getQueuedEmailJobsCount(): int
    {
        try {
            // Try to get queued jobs count from the jobs table
            return DB::table('jobs')
                ->where('payload', 'like', '%SendNotificationEmail%')
                ->count();
        } catch (\Exception $e) {
            // If jobs table doesn't exist or query fails, return 0
            return 0;
        }
    }
}
