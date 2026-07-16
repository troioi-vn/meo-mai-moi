<?php

declare(strict_types=1);

namespace App\Filament\Resources\HabitResource\RelationManagers;

use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class EntriesRelationManager extends RelationManager
{
    protected static string $relationship = 'entries';

    protected static ?string $title = 'Entry History';

    public function isReadOnly(): bool
    {
        return true;
    }

    public function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('entry_date')
                    ->label('Date')
                    ->date()
                    ->sortable(),
                TextColumn::make('pet.name')
                    ->label('Pet')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('value_int')
                    ->label('Value')
                    ->sortable(),
                TextColumn::make('updatedBy.name')
                    ->label('Updated By')
                    ->placeholder('Unknown')
                    ->searchable(),
                TextColumn::make('updated_at')
                    ->label('Updated')
                    ->dateTime()
                    ->sortable(),
            ])
            ->actions([])
            ->bulkActions([])
            ->defaultSort('entry_date', 'desc');
    }
}
