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
                ->label(
                    fn (): string =>
                    $this->record instanceof \App\Models\EmailConfiguration && $this->record->provider === 'smtp'
                        ? 'Send Test Email' : 'Test Connection'
                )
                ->icon('heroicon-o-signal')
                ->color('info')
                ->action(function (): void {
                    if (!$this->record instanceof \App\Models\EmailConfiguration) {
                        return;
                    }

                    $service = app(EmailConfigurationService::class);

                    try {
                        // For SMTP, check if test email address is provided
                        if ($this->record->provider === 'smtp') {
                            $testEmailAddress = $this->record->config['test_email_address'] ?? null;
                            if (!$testEmailAddress) {
                                Notification::make()
                                    ->title('Test Email Address Required')
                                    ->body('Please configure a test email address in the SMTP settings before sending a test email.')
                                    ->warning()
                                    ->send();
                                return;
                            }

                            $testResult = $service->testConfigurationWithDetails($this->record->provider, $this->record->config, $testEmailAddress);
                        } else {
                            $testResult = $service->testConfigurationWithDetails($this->record->provider, $this->record->config);
                        }

                        if ($testResult['success']) {
                            $title = $this->record->provider === 'smtp' ? 'Test Email Sent Successfully' : 'Connection Test Successful';
                            $body = $this->record->provider === 'smtp'
                                ? 'Test email was sent successfully to ' . ($this->record->config['test_email_address'] ?? 'the configured address') . '.'
                                : 'Email configuration is working correctly. A test email was sent.';

                            Notification::make()
                                ->title($title)
                                ->body($body)
                                ->success()
                                ->send();
                        } else {
                            $title = $this->record->provider === 'smtp' ? 'Test Email Failed' : 'Connection Test Failed';
                            $body = 'Email configuration test failed. Please check your settings.';

                            if (isset($testResult['error'])) {
                                $body = 'Test failed: ' . $testResult['error'];
                            }

                            Notification::make()
                                ->title($title)
                                ->body($body)
                                ->danger()
                                ->send();
                        }
                    } catch (\Exception $e) {
                        Notification::make()
                            ->title('Test Error')
                            ->body('Error testing configuration: '.$e->getMessage())
                            ->danger()
                            ->send();
                    }
                })
                ->requiresConfirmation()
                ->modalHeading(
                    fn (): string =>
                    $this->record instanceof \App\Models\EmailConfiguration && $this->record->provider === 'smtp'
                        ? 'Send Test Email' : 'Test Email Configuration'
                )
                ->modalDescription(
                    fn (): string =>
                    $this->record instanceof \App\Models\EmailConfiguration && $this->record->provider === 'smtp'
                        ? 'This will send a test email to the configured test email address. Continue?'
                        : 'This will send a test email to verify the configuration. Continue?'
                ),

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
