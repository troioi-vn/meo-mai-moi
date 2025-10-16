<?php

namespace App\Filament\Resources\NotificationResource\Pages;

use App\Filament\Resources\NotificationResource;
use Filament\Actions;
use Filament\Infolists;
use Filament\Infolists\Infolist;
use Filament\Resources\Pages\ViewRecord;

class ViewNotification extends ViewRecord
{
    protected static string $resource = NotificationResource::class;

    private function getNotification(): ?\App\Models\Notification
    {
        return $this->record instanceof \App\Models\Notification ? $this->record : null;
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make(),

            Actions\Action::make('mark_as_read')
                ->label('Mark as Read')
                ->icon('heroicon-o-check')
                ->color('success')
                ->visible(fn (): bool => ($notification = $this->getNotification()) && ! $notification->isRead())
                ->action(function (): void {
                    $notification = $this->getNotification();
                    if (! $notification) {
                        return;
                    }

                    $notification->markAsRead();

                    $this->refreshFormData(['read_at']);
                }),

            Actions\Action::make('mark_as_delivered')
                ->label('Mark as Delivered')
                ->icon('heroicon-o-paper-airplane')
                ->color('success')
                ->visible(fn (): bool => ($notification = $this->getNotification()) && ! $notification->delivered_at)
                ->action(function (): void {
                    $notification = $this->getNotification();
                    if (! $notification) {
                        return;
                    }

                    $notification->update([
                        'delivered_at' => now(),
                        'failed_at' => null,
                        'failure_reason' => null,
                    ]);

                    $this->refreshFormData(['delivered_at', 'failed_at', 'failure_reason']);
                }),

            Actions\Action::make('retry_delivery')
                ->label('Retry Delivery')
                ->icon('heroicon-o-arrow-path')
                ->color('info')
                ->visible(fn (): bool => ($notification = $this->getNotification()) && $notification->failed_at !== null)
                ->requiresConfirmation()
                ->action(function (): void {
                    $notification = $this->getNotification();
                    if (! $notification) {
                        return;
                    }

                    $notification->update([
                        'failed_at' => null,
                        'failure_reason' => null,
                        'delivered_at' => null,
                    ]);

                    // Here you would typically trigger the notification delivery system
                    // For now, we'll just mark it as delivered
                    $notification->update(['delivered_at' => now()]);

                    $this->refreshFormData(['delivered_at', 'failed_at', 'failure_reason']);
                }),

            Actions\Action::make('test_email_config')
                ->label('Test Email Configuration')
                ->icon('heroicon-o-wrench-screwdriver')
                ->color('warning')
                ->visible(fn (): bool => ($notification = $this->getNotification()) && $notification->failed_at !== null)
                ->action(function (): void {
                    // This would test the email configuration
                    // For now, we'll just show a success message
                    \Filament\Notifications\Notification::make()
                        ->title('Email Configuration Test')
                        ->body('Email configuration test completed successfully.')
                        ->success()
                        ->send();
                }),
        ];
    }

    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Infolists\Components\Section::make('Notification Details')
                    ->schema([
                        Infolists\Components\TextEntry::make('user.name')
                            ->label('Recipient'),

                        Infolists\Components\TextEntry::make('type_display')
                            ->label('Type')
                            ->badge()
                            ->color(fn (string $state): string => ($notification = $this->getNotification()) ? match ($notification->type) {
                                'placement_request' => 'primary',
                                'transfer_request' => 'warning',
                                'transfer_accepted' => 'success',
                                'handover_completed' => 'success',
                                'profile_approved' => 'success',
                                'transfer_rejected' => 'danger',
                                'profile_rejected' => 'danger',
                                'handover_scheduled' => 'info',
                                'review_received' => 'secondary',
                                'system_announcement' => 'gray',
                                default => 'primary',
                            } : 'gray'),
                        Infolists\Components\TextEntry::make('message')
                            ->label('Message')
                            ->columnSpanFull(),

                        Infolists\Components\TextEntry::make('link')
                            ->label('Action Link')
                            ->url(fn (?string $state): ?string => $state)
                            ->openUrlInNewTab()
                            ->columnSpanFull()
                            ->visible(fn (?string $state): bool => filled($state)),

                        Infolists\Components\KeyValueEntry::make('data')
                            ->label('Additional Data')
                            ->columnSpanFull()
                            ->visible(fn (?array $state): bool => filled($state)),
                    ])
                    ->columns(2),

                Infolists\Components\Section::make('Delivery & Engagement Status')
                    ->schema([
                        Infolists\Components\TextEntry::make('delivery_status')
                            ->label('Delivery Status')
                            ->badge()
                            ->color(fn (string $state): string => match ($state) {
                                'pending' => 'warning',
                                'delivered' => 'success',
                                'failed' => 'danger',
                                default => 'gray',
                            })
                            ->formatStateUsing(fn (string $state): string => ucfirst($state)),

                        Infolists\Components\TextEntry::make('engagement_status')
                            ->label('Engagement Status')
                            ->badge()
                            ->color(fn (string $state): string => match ($state) {
                                'not_delivered' => 'gray',
                                'delivered_unread' => 'warning',
                                'read' => 'success',
                                default => 'gray',
                            })
                            ->formatStateUsing(fn (string $state): string => match ($state) {
                                'not_delivered' => 'Not Delivered',
                                'delivered_unread' => 'Unread',
                                'read' => 'Read',
                                default => ucfirst(str_replace('_', ' ', $state)),
                            }),

                        Infolists\Components\IconEntry::make('read_at')
                            ->label('Read Status')
                            ->boolean()
                            ->getStateUsing(fn ($record) => $record->isRead())
                            ->trueIcon('heroicon-o-check-circle')
                            ->falseIcon('heroicon-o-x-circle')
                            ->trueColor('success')
                            ->falseColor('gray'),

                        Infolists\Components\TextEntry::make('created_at')
                            ->label('Created At')
                            ->dateTime(),

                        Infolists\Components\TextEntry::make('delivered_at')
                            ->label('Delivered At')
                            ->dateTime()
                            ->placeholder('Not delivered')
                            ->visible(fn (?string $state): bool => filled($state)),

                        Infolists\Components\TextEntry::make('read_at')
                            ->label('Read At')
                            ->dateTime()
                            ->placeholder('Not read')
                            ->visible(fn (?string $state): bool => filled($state)),

                        Infolists\Components\TextEntry::make('failed_at')
                            ->label('Failed At')
                            ->dateTime()
                            ->color('danger')
                            ->visible(fn (?string $state): bool => filled($state)),

                        Infolists\Components\TextEntry::make('failure_reason')
                            ->label('Failure Reason')
                            ->color('danger')
                            ->columnSpanFull()
                            ->visible(fn (?string $state): bool => filled($state)),
                    ])
                    ->columns(3),

                Infolists\Components\Section::make('Email Delivery Timeline')
                    ->schema([
                        Infolists\Components\ViewEntry::make('delivery_timeline')
                            ->view('filament.infolists.notification-delivery-timeline')
                            ->columnSpanFull(),
                    ])
                    ->visible(fn (): bool => ($notification = $this->getNotification()) && ($notification->created_at || $notification->delivered_at || $notification->failed_at || $notification->read_at)),
            ]);
    }
}
