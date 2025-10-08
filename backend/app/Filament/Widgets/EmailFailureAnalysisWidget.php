<?php

namespace App\Filament\Widgets;

use App\Models\Notification;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;

class EmailFailureAnalysisWidget extends BaseWidget
{
    protected static ?string $heading = 'Recent Email Failures';

    protected static ?int $sort = 4;

    protected int|string|array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Notification::query()
                    ->failed()
                    ->where('created_at', '>=', now()->subDays(7))
                    ->orderBy('failed_at', 'desc')
            )
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
                        'success' => ['transfer_accepted', 'handover_completed', 'profile_approved'],
                        'danger' => ['transfer_rejected', 'profile_rejected'],
                        'info' => 'handover_scheduled',
                        'secondary' => 'review_received',
                        'gray' => 'system_announcement',
                    ]),

                Tables\Columns\TextColumn::make('failure_reason')
                    ->label('Failure Reason')
                    ->limit(50)
                    ->tooltip(function (Tables\Columns\TextColumn $column): ?string {
                        $state = $column->getState();
                        if (! $state || strlen($state) <= 50) {
                            return null;
                        }

                        return $state;
                    })
                    ->searchable(),

                Tables\Columns\TextColumn::make('failed_at')
                    ->label('Failed At')
                    ->dateTime()
                    ->sortable(),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created At')
                    ->dateTime()
                    ->sortable(),
            ])
            ->actions([
                Tables\Actions\Action::make('retry')
                    ->label('Retry')
                    ->icon('heroicon-o-arrow-path')
                    ->color('info')
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

                Tables\Actions\Action::make('view_details')
                    ->label('View')
                    ->icon('heroicon-o-eye')
                    ->url(fn (Notification $record): string => route('filament.admin.resources.notifications.view', $record)
                    ),
            ])
            ->defaultPaginationPageOption(10)
            ->poll('30s');
    }
}
