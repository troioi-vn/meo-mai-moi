<?php

namespace App\Filament\Resources\NotificationResource\Pages;

use App\Filament\Resources\NotificationResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;
use Filament\Infolists;
use Filament\Infolists\Infolist;

class ViewNotification extends ViewRecord
{
    protected static string $resource = NotificationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make(),
            
            Actions\Action::make('mark_as_read')
                ->label('Mark as Read')
                ->icon('heroicon-o-check')
                ->color('success')
                ->visible(fn (): bool => !$this->record->is_read)
                ->action(function (): void {
                    $this->record->update([
                        'is_read' => true,
                        'read_at' => now(),
                    ]);
                    
                    $this->refreshFormData(['is_read', 'read_at']);
                }),
            
            Actions\Action::make('mark_as_delivered')
                ->label('Mark as Delivered')
                ->icon('heroicon-o-paper-airplane')
                ->color('success')
                ->visible(fn (): bool => !$this->record->delivered_at)
                ->action(function (): void {
                    $this->record->update([
                        'delivered_at' => now(),
                        'failed_at' => null,
                        'failure_reason' => null,
                    ]);
                    
                    $this->refreshFormData(['delivered_at', 'failed_at', 'failure_reason']);
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
                            ->color(fn (string $state): string => match($this->record->type) {
                                'placement_request' => 'primary',
                                'transfer_request' => 'warning',
                                'transfer_accepted', 'handover_completed', 'profile_approved' => 'success',
                                'transfer_rejected', 'profile_rejected' => 'danger',
                                'handover_scheduled' => 'info',
                                'review_received' => 'secondary',
                                'system_announcement' => 'gray',
                                default => 'primary',
                            }),
                        
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
                            ->color(fn (string $state): string => match($state) {
                                'pending' => 'warning',
                                'delivered' => 'success',
                                'failed' => 'danger',
                                default => 'gray',
                            })
                            ->formatStateUsing(fn (string $state): string => ucfirst($state)),
                        
                        Infolists\Components\TextEntry::make('engagement_status')
                            ->label('Engagement Status')
                            ->badge()
                            ->color(fn (string $state): string => match($state) {
                                'not_delivered' => 'gray',
                                'delivered_unread' => 'warning',
                                'read' => 'success',
                                default => 'gray',
                            })
                            ->formatStateUsing(fn (string $state): string => match($state) {
                                'not_delivered' => 'Not Delivered',
                                'delivered_unread' => 'Unread',
                                'read' => 'Read',
                                default => ucfirst(str_replace('_', ' ', $state)),
                            }),
                        
                        Infolists\Components\IconEntry::make('is_read')
                            ->label('Read Status')
                            ->boolean()
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
            ]);
    }
}