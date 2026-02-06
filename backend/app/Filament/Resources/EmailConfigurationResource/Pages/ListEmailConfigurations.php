<?php

declare(strict_types=1);

namespace App\Filament\Resources\EmailConfigurationResource\Pages;

use App\Filament\Resources\EmailConfigurationResource;
use App\Services\EmailConfigurationService;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ListRecords;

class ListEmailConfigurations extends ListRecords
{
    protected static string $resource = EmailConfigurationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('check_status')
                ->label('Check Email Status')
                ->icon('heroicon-o-information-circle')
                ->color('info')
                ->action(function (): void {
                    $service = app(EmailConfigurationService::class);

                    if ($service->isEmailEnabled()) {
                        $activeConfig = $service->getActiveConfiguration();
                        Notification::make()
                            ->title('Email System Active')
                            ->body("Email notifications are enabled using {$activeConfig->provider} provider.")
                            ->success()
                            ->send();
                    } else {
                        Notification::make()
                            ->title('Email System Inactive')
                            ->body('No active email configuration found. Email notifications are disabled.')
                            ->warning()
                            ->send();
                    }
                }),

            Actions\CreateAction::make()
                ->label('Add Email Configuration')
                ->icon('heroicon-o-plus'),
        ];
    }

    protected function getHeaderWidgets(): array
    {
        return [
            \App\Filament\Resources\EmailConfigurationResource\Widgets\EmailStatusWidget::class,
        ];
    }

    protected function getFooterWidgets(): array
    {
        return [
            \App\Filament\Resources\EmailConfigurationResource\Widgets\TestNotificationWidget::class,
        ];
    }
}
