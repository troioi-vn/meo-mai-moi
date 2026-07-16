<?php

declare(strict_types=1);

namespace App\Filament\Resources\UserResource\RelationManagers;

use App\Enums\NotificationType;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class NotificationPreferencesRelationManager extends RelationManager
{
    protected static string $relationship = 'notificationPreferences';

    protected static ?string $title = 'Notification Preferences';

    public function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('notification_type')
                    ->label('Notification Type')
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => NotificationType::tryFrom($state)?->getLabel() ?? str($state)->headline()->toString()),
                IconColumn::make('email_enabled')
                    ->label('Email')
                    ->boolean(),
                IconColumn::make('in_app_enabled')
                    ->label('In App')
                    ->boolean(),
                IconColumn::make('telegram_enabled')
                    ->label('Telegram')
                    ->boolean(),
                TextColumn::make('updated_at')
                    ->label('Updated')
                    ->dateTime()
                    ->since(),
            ])
            ->defaultSort('notification_type')
            ->paginated([10, 25])
            ->emptyStateHeading('No customized preferences')
            ->emptyStateDescription('This user currently receives the application defaults.');
    }
}
