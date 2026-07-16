<?php

declare(strict_types=1);

namespace App\Filament\Resources\UserResource\RelationManagers;

use App\Filament\Resources\EmailLogResource;
use Filament\Actions\ViewAction;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class EmailLogsRelationManager extends RelationManager
{
    protected static string $relationship = 'emailLogs';

    protected static ?string $title = 'Recent Email Deliveries';

    public function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('subject')
                    ->limit(60)
                    ->tooltip(fn ($record): string => $record->subject),
                TextColumn::make('recipient_email')
                    ->label('Recipient'),
                TextColumn::make('status')
                    ->badge(),
                TextColumn::make('retry_count')
                    ->label('Retries')
                    ->badge(),
                TextColumn::make('error_message')
                    ->label('Error')
                    ->limit(50)
                    ->placeholder('None'),
                TextColumn::make('created_at')
                    ->label('Queued')
                    ->dateTime()
                    ->since(),
            ])
            ->actions([
                ViewAction::make()
                    ->url(fn ($record): string => EmailLogResource::getUrl('view', ['record' => $record])),
            ])
            ->defaultSort('created_at', 'desc')
            ->paginated([10, 25])
            ->defaultPaginationPageOption(10);
    }
}
