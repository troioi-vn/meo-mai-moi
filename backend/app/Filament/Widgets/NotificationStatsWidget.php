<?php

namespace App\Filament\Widgets;

use App\Models\Notification;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class NotificationStatsWidget extends BaseWidget
{
    protected static ?int $sort = 2;

    protected function getStats(): array
    {
        $totalNotifications = Notification::count();
        $unreadNotifications = Notification::unread()->count();
        $deliveredNotifications = Notification::delivered()->count();
        $failedNotifications = Notification::failed()->count();
        $pendingNotifications = Notification::pending()->count();
        
        // Calculate delivery rate
        $deliveryRate = $totalNotifications > 0 
            ? round(($deliveredNotifications / $totalNotifications) * 100, 1)
            : 0;
        
        // Calculate engagement rate (read notifications out of delivered)
        $engagementRate = $deliveredNotifications > 0 
            ? round((Notification::read()->count() / $deliveredNotifications) * 100, 1)
            : 0;

        return [
            Stat::make('Total Notifications', $totalNotifications)
                ->description('All notifications in system')
                ->descriptionIcon('heroicon-m-bell')
                ->color('primary'),
            
            Stat::make('Unread Notifications', $unreadNotifications)
                ->description('Notifications not yet read')
                ->descriptionIcon('heroicon-m-envelope')
                ->color($unreadNotifications > 50 ? 'danger' : ($unreadNotifications > 10 ? 'warning' : 'success')),
            
            Stat::make('Delivery Rate', $deliveryRate . '%')
                ->description('Successfully delivered notifications')
                ->descriptionIcon('heroicon-m-paper-airplane')
                ->color($deliveryRate >= 95 ? 'success' : ($deliveryRate >= 85 ? 'warning' : 'danger')),
            
            Stat::make('Engagement Rate', $engagementRate . '%')
                ->description('Read rate of delivered notifications')
                ->descriptionIcon('heroicon-m-eye')
                ->color($engagementRate >= 70 ? 'success' : ($engagementRate >= 50 ? 'warning' : 'danger')),
            
            Stat::make('Failed Deliveries', $failedNotifications)
                ->description('Notifications that failed to deliver')
                ->descriptionIcon('heroicon-m-exclamation-triangle')
                ->color($failedNotifications > 0 ? 'danger' : 'success'),
            
            Stat::make('Pending Deliveries', $pendingNotifications)
                ->description('Notifications awaiting delivery')
                ->descriptionIcon('heroicon-m-clock')
                ->color($pendingNotifications > 20 ? 'warning' : 'primary'),
        ];
    }
}
