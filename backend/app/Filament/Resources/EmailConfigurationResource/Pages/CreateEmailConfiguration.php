<?php

namespace App\Filament\Resources\EmailConfigurationResource\Pages;

use App\Filament\Resources\EmailConfigurationResource;
use App\Services\EmailConfigurationService;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\CreateRecord;

class CreateEmailConfiguration extends CreateRecord
{
    protected static string $resource = EmailConfigurationResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function afterCreate(): void
    {
        $record = $this->record;

        if (!$record instanceof \App\Models\EmailConfiguration) {
            return;
        }

        // If this configuration is set to active, activate it properly
        if ($record->is_active) {
            try {
                $record->activate();

                // Update mail configuration
                $service = app(EmailConfigurationService::class);
                $service->updateMailConfig();

                Notification::make()
                    ->title('Configuration Created and Activated')
                    ->body('Email configuration has been created and activated successfully.')
                    ->success()
                    ->send();
            } catch (\Exception $e) {
                Notification::make()
                    ->title('Configuration Created but Activation Failed')
                    ->body('Configuration was created but could not be activated: '.$e->getMessage())
                    ->warning()
                    ->send();
            }
        } else {
            Notification::make()
                ->title('Configuration Created')
                ->body('Email configuration has been created. Use the "Activate" action to enable it.')
                ->success()
                ->send();
        }
    }

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        // Validate configuration before creating
        if (! empty($data['config'])) {
            $service = app(EmailConfigurationService::class);

            // Remove empty values from config
            $data['config'] = array_filter($data['config'], function ($value) {
                return $value !== null && $value !== '';
            });
        }

        return $data;
    }
}
