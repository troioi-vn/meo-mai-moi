<?php

declare(strict_types=1);

namespace App\Filament\Resources\GroupResource\RelationManagers;

use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PetsRelationManager extends RelationManager
{
    protected static string $relationship = 'groupPets';

    protected static ?string $title = 'Pets';

    public function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('pet.name')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('pet.petType.name')->label('Type')->searchable(),
                Tables\Columns\TextColumn::make('addedBy.name')->label('Added by')->searchable(),
                Tables\Columns\TextColumn::make('start_at')->dateTime()->sortable(),
                Tables\Columns\TextColumn::make('end_at')->dateTime()->placeholder('Active')->sortable(),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('active')
                    ->queries(
                        true: fn (Builder $query): Builder => $query->whereNull('end_at'),
                        false: fn (Builder $query): Builder => $query->whereNotNull('end_at'),
                    ),
            ])
            ->defaultSort('start_at', 'desc');
    }
}
