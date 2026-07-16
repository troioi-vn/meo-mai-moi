<?php

declare(strict_types=1);

namespace App\Filament\Resources\UserResource\RelationManagers;

use App\Enums\NotificationType;
use App\Filament\Resources\NotificationResource;
use Filament\Actions\ViewAction;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class NotificationsRelationManager extends RelationManager
{
    protected static string $relationship = 'notifications';

    protected static ?string $title = 'Recent Notifications';

    public function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('type')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => NotificationType::tryFrom((string) $state)?->getLabel() ?? str($state ?? 'notification')->headline()->toString()),
                TextColumn::make('message')
                    ->limit(60)
                    ->tooltip(fn ($record): ?string => $record->message),
                TextColumn::make('delivery_status')
                    ->label('Delivery')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'delivered' => 'success',
                        'failed' => 'danger',
                        default => 'warning',
                    }),
                TextColumn::make('read_at')
                    ->label('Read')
                    ->dateTime()
                    ->placeholder('Unread'),
                TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->since(),
            ])
            ->actions([
                ViewAction::make()
                    ->url(fn ($record): string => NotificationResource::getUrl('view', ['record' => $record])),
            ])
            ->defaultSort('created_at', 'desc')
            ->paginated([10, 25])
            ->defaultPaginationPageOption(10);
    }
}
