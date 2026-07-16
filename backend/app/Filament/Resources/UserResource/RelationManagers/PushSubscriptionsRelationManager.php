<?php

declare(strict_types=1);

namespace App\Filament\Resources\UserResource\RelationManagers;

use App\Models\PushSubscription;
use Filament\Actions\Action;
use Filament\Notifications\Notification;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class PushSubscriptionsRelationManager extends RelationManager
{
    protected static string $relationship = 'pushSubscriptions';

    protected static ?string $title = 'Push Subscription Health';

    public function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('health_status')
                    ->label('Health')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'healthy' => 'success',
                        'stale' => 'warning',
                        'expired' => 'danger',
                        default => 'gray',
                    }),
                TextColumn::make('masked_endpoint')
                    ->label('Endpoint')
                    ->copyable(),
                TextColumn::make('masked_p256dh')
                    ->label('P256DH'),
                TextColumn::make('masked_auth')
                    ->label('Auth'),
                TextColumn::make('content_encoding')
                    ->label('Encoding'),
                TextColumn::make('last_seen_at')
                    ->label('Last Seen')
                    ->dateTime()
                    ->since()
                    ->placeholder('Never'),
                TextColumn::make('expires_at')
                    ->label('Expires')
                    ->dateTime()
                    ->placeholder('No expiry'),
            ])
            ->actions([
                Action::make('remove_stale')
                    ->label('Remove stale subscription')
                    ->icon('heroicon-o-trash')
                    ->color('danger')
                    ->visible(fn (PushSubscription $record): bool => $record->isStale())
                    ->requiresConfirmation()
                    ->modalDescription('Remove this expired or inactive browser subscription? Active subscriptions cannot be removed here.')
                    ->action(function (PushSubscription $record): void {
                        if (! $record->removeIfStale()) {
                            Notification::make()
                                ->title('Subscription is active')
                                ->warning()
                                ->send();

                            return;
                        }

                        Notification::make()
                            ->title('Stale push subscription removed')
                            ->success()
                            ->send();
                    }),
            ])
            ->defaultSort('last_seen_at', 'desc')
            ->paginated([10, 25])
            ->defaultPaginationPageOption(10);
    }
}
