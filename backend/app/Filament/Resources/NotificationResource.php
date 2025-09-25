<?php

namespace App\Filament\Resources;

use App\Filament\Resources\NotificationResource\Pages;
use App\Models\Notification;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Actions\BulkAction;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class NotificationResource extends Resource
{
    protected static ?string $model = Notification::class;

    protected static ?string $navigationIcon = 'heroicon-o-bell';

    protected static ?string $navigationGroup = 'Communication';

    protected static ?int $navigationSort = 1;

    protected static ?string $recordTitleAttribute = 'message';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Notification Details')
                    ->schema([
                        Forms\Components\Select::make('user_id')
                            ->label('Recipient')
                            ->relationship('user', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),

                        Forms\Components\Select::make('type')
                            ->label('Notification Type')
                            ->options([
                                'placement_request' => 'Placement Request',
                                'transfer_request' => 'Transfer Request',
                                'transfer_accepted' => 'Transfer Accepted',
                                'transfer_rejected' => 'Transfer Rejected',
                                'handover_scheduled' => 'Handover Scheduled',
                                'handover_completed' => 'Handover Completed',
                                'review_received' => 'Review Received',
                                'profile_approved' => 'Profile Approved',
                                'profile_rejected' => 'Profile Rejected',
                                'system_announcement' => 'System Announcement',
                            ])
                            ->searchable()
                            ->nullable(),

                        Forms\Components\Textarea::make('message')
                            ->label('Message')
                            ->required()
                            ->columnSpanFull()
                            ->rows(3),

                        Forms\Components\TextInput::make('link')
                            ->label('Action Link')
                            ->url()
                            ->nullable()
                            ->columnSpanFull(),

                        Forms\Components\KeyValue::make('data')
                            ->label('Additional Data')
                            ->nullable()
                            ->columnSpanFull()
                            ->helperText('Additional structured data for the notification'),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Delivery Status')
                    ->schema([
                        Forms\Components\Toggle::make('is_read')
                            ->label('Mark as Read')
                            ->default(false),

                        Forms\Components\DateTimePicker::make('read_at')
                            ->label('Read At')
                            ->nullable(),

                        Forms\Components\DateTimePicker::make('delivered_at')
                            ->label('Delivered At')
                            ->nullable(),

                        Forms\Components\DateTimePicker::make('failed_at')
                            ->label('Failed At')
                            ->nullable(),

                        Forms\Components\Textarea::make('failure_reason')
                            ->label('Failure Reason')
                            ->nullable()
                            ->columnSpanFull()
                            ->rows(2),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('user.name')
                    ->label('Recipient')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\BadgeColumn::make('type_display')
                    ->label('Type')
                    ->colors([
                        'primary' => 'placement_request',
                        'warning' => 'transfer_request',
                        'success' => 'transfer_accepted',
                        'danger' => 'transfer_rejected',
                        'info' => 'handover_scheduled',
                        'success' => 'handover_completed',
                        'secondary' => 'review_received',
                        'success' => 'profile_approved',
                        'danger' => 'profile_rejected',
                        'gray' => 'system_announcement',
                    ])
                    ->searchable(),

                Tables\Columns\TextColumn::make('message')
                    ->label('Message')
                    ->limit(50)
                    ->tooltip(function (Tables\Columns\TextColumn $column): ?string {
                        $state = $column->getState();
                        if (strlen($state) <= 50) {
                            return null;
                        }

                        return $state;
                    })
                    ->searchable(),

                Tables\Columns\BadgeColumn::make('delivery_status')
                    ->label('Delivery')
                    ->colors([
                        'warning' => 'pending',
                        'success' => 'delivered',
                        'danger' => 'failed',
                    ])
                    ->formatStateUsing(fn (string $state): string => ucfirst($state))
                    ->tooltip(function (Notification $record): ?string {
                        if ($record->failed_at && $record->failure_reason) {
                            return 'Failed: '.$record->failure_reason;
                        }
                        if ($record->delivered_at) {
                            return 'Delivered at: '.$record->delivered_at->format('M j, Y g:i A');
                        }

                        return null;
                    }),

                Tables\Columns\BadgeColumn::make('engagement_status')
                    ->label('Engagement')
                    ->colors([
                        'gray' => 'not_delivered',
                        'warning' => 'delivered_unread',
                        'success' => 'read',
                    ])
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'not_delivered' => 'Not Delivered',
                        'delivered_unread' => 'Unread',
                        'read' => 'Read',
                        default => ucfirst(str_replace('_', ' ', $state)),
                    }),

                Tables\Columns\IconColumn::make('is_read')
                    ->label('Read')
                    ->boolean()
                    ->trueIcon('heroicon-o-check-circle')
                    ->falseIcon('heroicon-o-x-circle')
                    ->trueColor('success')
                    ->falseColor('gray'),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('delivered_at')
                    ->label('Delivered')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('read_at')
                    ->label('Read')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('failure_reason')
                    ->label('Failure Reason')
                    ->limit(30)
                    ->tooltip(function (Tables\Columns\TextColumn $column): ?string {
                        $state = $column->getState();
                        if (! $state || strlen($state) <= 30) {
                            return null;
                        }

                        return $state;
                    })
                    ->visible(fn (): bool => request()->has('tableFilters.delivery_status.value') &&
                        request()->get('tableFilters')['delivery_status']['value'] === 'failed')
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('type')
                    ->label('Notification Type')
                    ->options([
                        'placement_request' => 'Placement Request',
                        'transfer_request' => 'Transfer Request',
                        'transfer_accepted' => 'Transfer Accepted',
                        'transfer_rejected' => 'Transfer Rejected',
                        'handover_scheduled' => 'Handover Scheduled',
                        'handover_completed' => 'Handover Completed',
                        'review_received' => 'Review Received',
                        'profile_approved' => 'Profile Approved',
                        'profile_rejected' => 'Profile Rejected',
                        'system_announcement' => 'System Announcement',
                    ]),

                SelectFilter::make('delivery_status')
                    ->label('Delivery Status')
                    ->options([
                        'pending' => 'Pending',
                        'delivered' => 'Delivered',
                        'failed' => 'Failed',
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        if (! $data['value']) {
                            return $query;
                        }

                        return match ($data['value']) {
                            'pending' => $query->pending(),
                            'delivered' => $query->delivered(),
                            'failed' => $query->failed(),
                            default => $query,
                        };
                    }),

                SelectFilter::make('engagement_status')
                    ->label('Engagement Status')
                    ->options([
                        'read' => 'Read',
                        'unread' => 'Unread',
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        if (! $data['value']) {
                            return $query;
                        }

                        return match ($data['value']) {
                            'read' => $query->read(),
                            'unread' => $query->unread(),
                            default => $query,
                        };
                    }),

                Filter::make('failed_notifications')
                    ->label('Failed Notifications')
                    ->query(fn (Builder $query): Builder => $query->failed()),

                Filter::make('unread_notifications')
                    ->label('Unread Notifications')
                    ->query(fn (Builder $query): Builder => $query->unread()),

                Filter::make('created_at')
                    ->form([
                        Forms\Components\DatePicker::make('created_from')
                            ->label('Created From'),
                        Forms\Components\DatePicker::make('created_until')
                            ->label('Created Until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['created_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('created_at', '>=', $date),
                            )
                            ->when(
                                $data['created_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('created_at', '<=', $date),
                            );
                    }),
            ])
            ->actions([
                Tables\Actions\Action::make('mark_as_read')
                    ->label('Mark as Read')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->visible(fn (Notification $record): bool => ! $record->is_read)
                    ->action(function (Notification $record): void {
                        $record->update([
                            'is_read' => true,
                            'read_at' => now(),
                        ]);
                    }),

                Tables\Actions\Action::make('mark_as_unread')
                    ->label('Mark as Unread')
                    ->icon('heroicon-o-x-mark')
                    ->color('warning')
                    ->visible(fn (Notification $record): bool => $record->is_read)
                    ->action(function (Notification $record): void {
                        $record->update([
                            'is_read' => false,
                            'read_at' => null,
                        ]);
                    }),

                Tables\Actions\Action::make('mark_as_delivered')
                    ->label('Mark as Delivered')
                    ->icon('heroicon-o-paper-airplane')
                    ->color('success')
                    ->visible(fn (Notification $record): bool => ! $record->delivered_at)
                    ->action(function (Notification $record): void {
                        $record->update([
                            'delivered_at' => now(),
                            'failed_at' => null,
                            'failure_reason' => null,
                        ]);
                    }),

                Tables\Actions\Action::make('mark_as_failed')
                    ->label('Mark as Failed')
                    ->icon('heroicon-o-exclamation-triangle')
                    ->color('danger')
                    ->visible(fn (Notification $record): bool => ! $record->failed_at)
                    ->form([
                        Forms\Components\Textarea::make('failure_reason')
                            ->label('Failure Reason')
                            ->required()
                            ->rows(3),
                    ])
                    ->action(function (Notification $record, array $data): void {
                        $record->update([
                            'failed_at' => now(),
                            'failure_reason' => $data['failure_reason'],
                            'delivered_at' => null,
                        ]);
                    }),

                Tables\Actions\Action::make('retry_delivery')
                    ->label('Retry Delivery')
                    ->icon('heroicon-o-arrow-path')
                    ->color('info')
                    ->visible(fn (Notification $record): bool => $record->failed_at !== null)
                    ->requiresConfirmation()
                    ->action(function (Notification $record): void {
                        $record->update([
                            'failed_at' => null,
                            'failure_reason' => null,
                            'delivered_at' => null,
                        ]);

                        // Here you would typically trigger the notification delivery system
                        // For now, we'll just mark it as delivered
                        $record->update(['delivered_at' => now()]);
                    }),

                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    BulkAction::make('mark_as_read')
                        ->label('Mark as Read')
                        ->icon('heroicon-o-check')
                        ->color('success')
                        ->requiresConfirmation()
                        ->action(function (Collection $records): void {
                            $records->each(function (Notification $record): void {
                                $record->update([
                                    'is_read' => true,
                                    'read_at' => now(),
                                ]);
                            });
                        }),

                    BulkAction::make('mark_as_unread')
                        ->label('Mark as Unread')
                        ->icon('heroicon-o-x-mark')
                        ->color('warning')
                        ->requiresConfirmation()
                        ->action(function (Collection $records): void {
                            $records->each(function (Notification $record): void {
                                $record->update([
                                    'is_read' => false,
                                    'read_at' => null,
                                ]);
                            });
                        }),

                    BulkAction::make('mark_as_delivered')
                        ->label('Mark as Delivered')
                        ->icon('heroicon-o-paper-airplane')
                        ->color('success')
                        ->requiresConfirmation()
                        ->action(function (Collection $records): void {
                            $records->each(function (Notification $record): void {
                                $record->update([
                                    'delivered_at' => now(),
                                    'failed_at' => null,
                                    'failure_reason' => null,
                                ]);
                            });
                        }),

                    BulkAction::make('cleanup_old')
                        ->label('Cleanup Old Notifications')
                        ->icon('heroicon-o-trash')
                        ->color('danger')
                        ->form([
                            Forms\Components\Select::make('days')
                                ->label('Delete notifications older than')
                                ->options([
                                    '30' => '30 days',
                                    '60' => '60 days',
                                    '90' => '90 days',
                                    '180' => '6 months',
                                    '365' => '1 year',
                                ])
                                ->default('90')
                                ->required(),

                            Forms\Components\Checkbox::make('read_only')
                                ->label('Only delete read notifications')
                                ->default(true),
                        ])
                        ->requiresConfirmation()
                        ->modalHeading('Cleanup Old Notifications')
                        ->modalDescription('This will permanently delete old notifications. This action cannot be undone.')
                        ->action(function (Collection $records, array $data): void {
                            $cutoffDate = now()->subDays((int) $data['days']);

                            $query = Notification::where('created_at', '<', $cutoffDate);

                            if ($data['read_only']) {
                                $query->where('is_read', true);
                            }

                            $query->delete();
                        }),

                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc')
            ->poll('30s'); // Auto-refresh every 30 seconds
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListNotifications::route('/'),
            'create' => Pages\CreateNotification::route('/create'),
            'view' => Pages\ViewNotification::route('/{record}'),
            'edit' => Pages\EditNotification::route('/{record}/edit'),
        ];
    }

    public static function getNavigationBadge(): ?string
    {
        return static::getModel()::unread()->count();
    }

    public static function getNavigationBadgeColor(): ?string
    {
        $unreadCount = static::getModel()::unread()->count();

        if ($unreadCount > 50) {
            return 'danger';
        }

        if ($unreadCount > 10) {
            return 'warning';
        }

        return 'primary';
    }
}
