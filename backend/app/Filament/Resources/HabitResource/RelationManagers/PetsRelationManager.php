<?php

declare(strict_types=1);

namespace App\Filament\Resources\HabitResource\RelationManagers;

use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class PetsRelationManager extends RelationManager
{
    protected static string $relationship = 'pets';

    protected static ?string $title = 'Linked Pets';

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
                TextColumn::make('name')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('status')
                    ->badge()
                    ->sortable(),
                TextColumn::make('petType.name')
                    ->label('Type'),
                TextColumn::make('pivot.created_at')
                    ->label('Linked At')
                    ->dateTime(),
            ])
            ->actions([])
            ->bulkActions([]);
    }
}
