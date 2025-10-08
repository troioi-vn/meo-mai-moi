<?php

namespace App\Filament\Resources\EmailConfigurationResource\Pages;

use App\Filament\Resources\EmailConfigurationResource;
use App\Services\EmailConfigurationService;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;

class EditEmailConfiguration extends EditRecord
{
    protected static string $resource = EmailConfigurationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('test_connection')
                ->label('Test Connection')
                ->icon('heroicon-o-signal')
                ->color('info')
                ->action(function (): void {
                    if (!$this->record instanceof \App\Models\EmailConfiguration) {
                        return;
                    }

                    $service = app(EmailConfigurationService::class);

                    try {
                        $success = $service->testConfiguration($this->record->provider, $this->record->config);

                        if ($success) {
                            Notification::make()
                                ->title('Connection Test Successful')
                                ->body('Email configuration is working correctly. A test email was sent.')
                                ->success()
                                ->send();
                        } else {
                            Notification::make()
                                ->title('Connection Test Failed')
                                ->body('Email configuration test failed. Please check your settings.')
                                ->danger()
                                ->send();
                        }
                    } catch (\Exception $e) {
                        Notification::make()
                            ->title('Connection Test Error')
                            ->body('Error testing configuration: '.$e->getMessage())
                            ->danger()
                            ->send();
                    }
                })
                ->requiresConfirmation()
                ->modalHeading('Test Email Configuration')
                ->modalDescription('This will send a test email to verify the configuration. Continue?'),

            Actions\Action::make('activate')
                ->label('Activate Configuration')
                ->icon('heroicon-o-power')
                ->color('success')
                ->visible(fn (): bool => $this->record instanceof \App\Models\EmailConfiguration && ! $this->record->is_active && $this->record->isValid())
                ->action(function (): void {
                    if (!$this->record instanceof \App\Models\EmailConfiguration) {
                        return;
                    }

                    try {
                        $this->record->activate();

                        // Update mail configuration
                        $service = app(EmailConfigurationService::class);
                        $service->updateMailConfig();

                        // Refresh the record to show updated status
                        $this->refreshFormData(['is_active']);

                        Notification::make()
                            ->title('Configuration Activated')
                            ->body('Email configuration has been activated successfully.')
                            ->success()
                            ->send();
                    } catch (\Exception $e) {
                        Notification::make()
                            ->title('Activation Failed')
                            ->body('Failed to activate configuration: '.$e->getMessage())
                            ->danger()
                            ->send();
                    }
                })
                ->requiresConfirmation()
                ->modalHeading('Activate Email Configuration')
                ->modalDescription('This will deactivate any other active configuration and activate this one. Continue?'),

            Actions\ViewAction::make(),
            Actions\DeleteAction::make()
                ->visible(fn (): bool => $this->record instanceof \App\Models\EmailConfiguration && ! $this->record->is_active),
        ];
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function afterSave(): void
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
                    ->title('Configuration Updated and Activated')
                    ->body('Email configuration has been updated and activated successfully.')
                    ->success()
                    ->send();
            } catch (\Exception $e) {
                Notification::make()
                    ->title('Configuration Updated but Activation Failed')
                    ->body('Configuration was updated but could not be activated: '.$e->getMessage())
                    ->warning()
                    ->send();
            }
        } else {
            Notification::make()
                ->title('Configuration Updated')
                ->body('Email configuration has been updated successfully.')
                ->success()
                ->send();
        }
    }

    protected function mutateFormDataBeforeSave(array $data): array
    {
        // Remove empty values from config
        if (! empty($data['config'])) {
            $data['config'] = array_filter($data['config'], function ($value) {
                return $value !== null && $value !== '';
            });
        }

        return $data;
    }
}
