<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Models\ContentTranslation;
use App\Models\User;
use App\Services\QueueOperationsService;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class OperationsAlertsWidget extends BaseWidget
{
    protected static ?int $sort = 5;

    protected function getStats(): array
    {
        $queue = app(QueueOperationsService::class);
        $failedJobs = $queue->failedCount();
        $pendingTranslations = ContentTranslation::query()
            ->where('status', ContentTranslation::STATUS_PENDING)
            ->count();
        $failedTranslations = ContentTranslation::query()
            ->where('status', ContentTranslation::STATUS_FAILED)
            ->count();

        return [
            Stat::make('Queued Jobs', number_format($queue->queueDepth()))
                ->color('info')
                ->icon('heroicon-o-queue-list'),
            Stat::make('Failed Jobs', number_format($failedJobs))
                ->color($failedJobs > 0 ? 'danger' : 'success')
                ->icon('heroicon-o-exclamation-triangle'),
            Stat::make('Pending Translations', number_format($pendingTranslations))
                ->color($pendingTranslations > 0 ? 'warning' : 'success')
                ->icon('heroicon-o-language'),
            Stat::make('Failed Translations', number_format($failedTranslations))
                ->color($failedTranslations > 0 ? 'danger' : 'success')
                ->icon('heroicon-o-x-circle'),
        ];
    }

    public static function canView(): bool
    {
        $user = auth()->user();

        return $user instanceof User && $user->hasRole('super_admin');
    }
}
