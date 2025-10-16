<?php

namespace App\Filament\Resources\EmailConfigurationResource\Widgets;

use App\Models\EmailConfiguration;
use App\Services\EmailConfigurationService;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class EmailStatusWidget extends BaseWidget
{
    protected function getStats(): array
    {
        $service = app(EmailConfigurationService::class);
        $totalConfigs = EmailConfiguration::count();
        $activeConfig = EmailConfiguration::getActive();
        $validConfigs = EmailConfiguration::all()->filter(fn (EmailConfiguration $config) => $config->isValid())->count();

        return [
            Stat::make('Email System Status', $service->isEmailEnabled() ? 'Active' : 'Inactive')
                ->description($service->isEmailEnabled() ? 'Email notifications are working' : 'No active email configuration')
                ->descriptionIcon($service->isEmailEnabled() ? 'heroicon-m-check-circle' : 'heroicon-m-x-circle')
                ->color($service->isEmailEnabled() ? 'success' : 'danger'),

            Stat::make('Active Provider', $activeConfig ? strtoupper($activeConfig->provider) : 'None')
                ->description($activeConfig ? $activeConfig->config['from_address'] : 'No active configuration')
                ->descriptionIcon('heroicon-m-envelope')
                ->color($activeConfig ? 'info' : 'gray'),

            Stat::make('Total Configurations', $totalConfigs)
                ->description($validConfigs.' valid, '.($totalConfigs - $validConfigs).' invalid')
                ->descriptionIcon('heroicon-m-cog-6-tooth')
                ->color($validConfigs > 0 ? 'success' : 'warning'),
        ];
    }

    protected function getColumns(): int
    {
        return 3;
    }
}
