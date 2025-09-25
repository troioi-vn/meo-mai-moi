<?php

namespace App\Filament\Widgets;

use App\Models\Notification;
use Filament\Widgets\ChartWidget;

class EmailDeliveryChart extends ChartWidget
{
    protected static ?string $heading = 'Email Delivery Trends (Last 7 Days)';

    protected static ?int $sort = 3;

    protected int|string|array $columnSpan = 'full';

    protected function getData(): array
    {
        $data = $this->getEmailDeliveryData();

        return [
            'datasets' => [
                [
                    'label' => 'Delivered',
                    'data' => $data['delivered'],
                    'backgroundColor' => 'rgba(34, 197, 94, 0.1)',
                    'borderColor' => 'rgb(34, 197, 94)',
                    'borderWidth' => 2,
                    'fill' => true,
                ],
                [
                    'label' => 'Failed',
                    'data' => $data['failed'],
                    'backgroundColor' => 'rgba(239, 68, 68, 0.1)',
                    'borderColor' => 'rgb(239, 68, 68)',
                    'borderWidth' => 2,
                    'fill' => true,
                ],
                [
                    'label' => 'Pending',
                    'data' => $data['pending'],
                    'backgroundColor' => 'rgba(245, 158, 11, 0.1)',
                    'borderColor' => 'rgb(245, 158, 11)',
                    'borderWidth' => 2,
                    'fill' => true,
                ],
            ],
            'labels' => $data['labels'],
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }

    protected function getOptions(): array
    {
        return [
            'plugins' => [
                'legend' => [
                    'display' => true,
                    'position' => 'top',
                ],
            ],
            'scales' => [
                'y' => [
                    'beginAtZero' => true,
                    'ticks' => [
                        'precision' => 0,
                    ],
                ],
            ],
            'interaction' => [
                'intersect' => false,
                'mode' => 'index',
            ],
        ];
    }

    protected function getEmailDeliveryData(): array
    {
        $delivered = [];
        $failed = [];
        $pending = [];
        $labels = [];

        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $startOfDay = $date->copy()->startOfDay();
            $endOfDay = $date->copy()->endOfDay();

            $labels[] = $date->format('M j');

            // Get counts for each status
            $deliveredCount = Notification::whereBetween('created_at', [$startOfDay, $endOfDay])
                ->delivered()
                ->count();
            $delivered[] = $deliveredCount;

            $failedCount = Notification::whereBetween('created_at', [$startOfDay, $endOfDay])
                ->failed()
                ->count();
            $failed[] = $failedCount;

            $pendingCount = Notification::whereBetween('created_at', [$startOfDay, $endOfDay])
                ->pending()
                ->count();
            $pending[] = $pendingCount;
        }

        return [
            'delivered' => $delivered,
            'failed' => $failed,
            'pending' => $pending,
            'labels' => $labels,
        ];
    }
}
