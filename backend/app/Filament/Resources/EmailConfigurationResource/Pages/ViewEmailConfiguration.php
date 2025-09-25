<?php

namespace App\Filament\Resources\EmailConfigurationResource\Pages;

use App\Filament\Resources\EmailConfigurationResource;
use App\Services\EmailConfigurationService;
use Filament\Actions;
use Filament\Infolists;
use Filament\Infolists\Infolist;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ViewRecord;

class ViewEmailConfiguration extends ViewRecord
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
                ->label('Activate')
                ->icon('heroicon-o-power')
                ->color('success')
                ->visible(fn (): bool => ! $this->record->is_active && $this->record->isValid())
                ->action(function (): void {
                    try {
                        $this->record->activate();

                        // Update mail configuration
                        $service = app(EmailConfigurationService::class);
                        $service->updateMailConfig();

                        Notification::make()
                            ->title('Configuration Activated')
                            ->body('Email configuration has been activated successfully.')
                            ->success()
                            ->send();

                        // Redirect to refresh the page and show updated status
                        $this->redirect($this->getResource()::getUrl('view', ['record' => $this->record]));
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

            Actions\Action::make('deactivate')
                ->label('Deactivate')
                ->icon('heroicon-o-power')
                ->color('warning')
                ->visible(fn (): bool => $this->record->is_active)
                ->action(function (): void {
                    try {
                        $this->record->update(['is_active' => false]);

                        Notification::make()
                            ->title('Configuration Deactivated')
                            ->body('Email configuration has been deactivated.')
                            ->success()
                            ->send();

                        // Redirect to refresh the page and show updated status
                        $this->redirect($this->getResource()::getUrl('view', ['record' => $this->record]));
                    } catch (\Exception $e) {
                        Notification::make()
                            ->title('Deactivation Failed')
                            ->body('Failed to deactivate configuration: '.$e->getMessage())
                            ->danger()
                            ->send();
                    }
                })
                ->requiresConfirmation()
                ->modalHeading('Deactivate Email Configuration')
                ->modalDescription('This will disable email sending until another configuration is activated. Continue?'),

            Actions\EditAction::make(),
            Actions\DeleteAction::make()
                ->visible(fn (): bool => ! $this->record->is_active),
        ];
    }

    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Infolists\Components\Section::make('Configuration Overview')
                    ->schema([
                        Infolists\Components\TextEntry::make('provider')
                            ->label('Provider')
                            ->badge()
                            ->color(fn (string $state): string => match ($state) {
                                'smtp' => 'info',
                                'mailgun' => 'success',
                                default => 'gray',
                            })
                            ->formatStateUsing(fn (string $state): string => strtoupper($state)),

                        Infolists\Components\IconEntry::make('is_active')
                            ->label('Active Status')
                            ->boolean()
                            ->trueIcon('heroicon-o-check-circle')
                            ->falseIcon('heroicon-o-x-circle')
                            ->trueColor('success')
                            ->falseColor('gray'),

                        Infolists\Components\TextEntry::make('status')
                            ->label('Configuration Status')
                            ->badge()
                            ->color(fn (): string => $this->record->isValid() ? 'success' : 'danger')
                            ->formatStateUsing(fn (): string => $this->record->isValid() ? 'Valid' : 'Invalid'),

                        Infolists\Components\TextEntry::make('created_at')
                            ->label('Created')
                            ->dateTime(),

                        Infolists\Components\TextEntry::make('updated_at')
                            ->label('Last Updated')
                            ->dateTime(),
                    ])
                    ->columns(3),

                Infolists\Components\Section::make('Email Settings')
                    ->schema([
                        Infolists\Components\TextEntry::make('config.from_address')
                            ->label('From Email Address')
                            ->copyable()
                            ->copyMessage('Email address copied')
                            ->copyMessageDuration(1500),

                        Infolists\Components\TextEntry::make('config.from_name')
                            ->label('From Name')
                            ->placeholder('Not set'),
                    ])
                    ->columns(2),

                Infolists\Components\Section::make('Provider Configuration')
                    ->schema([
                        // SMTP Configuration
                        Infolists\Components\TextEntry::make('config.host')
                            ->label('SMTP Host')
                            ->visible(fn (): bool => $this->record->provider === 'smtp'),

                        Infolists\Components\TextEntry::make('config.port')
                            ->label('SMTP Port')
                            ->visible(fn (): bool => $this->record->provider === 'smtp'),

                        Infolists\Components\TextEntry::make('config.username')
                            ->label('Username')
                            ->visible(fn (): bool => $this->record->provider === 'smtp'),

                        Infolists\Components\TextEntry::make('config.encryption')
                            ->label('Encryption')
                            ->badge()
                            ->color('info')
                            ->formatStateUsing(fn (?string $state): string => $state ? strtoupper($state) : 'None')
                            ->visible(fn (): bool => $this->record->provider === 'smtp'),

                        // Mailgun Configuration
                        Infolists\Components\TextEntry::make('config.domain')
                            ->label('Mailgun Domain')
                            ->copyable()
                            ->copyMessage('Domain copied')
                            ->copyMessageDuration(1500)
                            ->visible(fn (): bool => $this->record->provider === 'mailgun'),

                        Infolists\Components\TextEntry::make('config.endpoint')
                            ->label('API Endpoint')
                            ->visible(fn (): bool => $this->record->provider === 'mailgun'),
                    ])
                    ->columns(2),

                Infolists\Components\Section::make('Validation Results')
                    ->schema([
                        Infolists\Components\RepeatableEntry::make('validation_errors')
                            ->label('Configuration Issues')
                            ->schema([
                                Infolists\Components\TextEntry::make('error')
                                    ->label('')
                                    ->color('danger'),
                            ])
                            ->state(fn (): array => collect($this->record->validateConfig())
                                ->map(fn (string $error) => ['error' => $error])
                                ->toArray()
                            )
                            ->visible(fn (): bool => ! $this->record->isValid()),

                        Infolists\Components\TextEntry::make('validation_status')
                            ->label('Validation Status')
                            ->badge()
                            ->color('success')
                            ->state('All configuration requirements are met')
                            ->visible(fn (): bool => $this->record->isValid()),
                    ])
                    ->visible(fn (): bool => ! empty($this->record->validateConfig()) || $this->record->isValid()),
            ]);
    }
}
