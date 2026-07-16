<?php

declare(strict_types=1);

namespace App\Filament\Resources\ChatResource\RelationManagers;

use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

class ParticipantsRelationManager extends RelationManager
{
    protected static string $relationship = 'chatUsers';

    protected static ?string $title = 'Participants';

    public function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('user.name')
                    ->label('Participant')
                    ->searchable(),
                Tables\Columns\TextColumn::make('user.email')
                    ->label('Email')
                    ->searchable(),
                Tables\Columns\TextColumn::make('role')
                    ->badge(),
                Tables\Columns\TextColumn::make('joined_at')
                    ->dateTime()
                    ->sortable(),
                Tables\Columns\TextColumn::make('left_at')
                    ->dateTime()
                    ->placeholder('Active')
                    ->sortable(),
                Tables\Columns\TextColumn::make('last_read_at')
                    ->label('Last read')
                    ->dateTime()
                    ->placeholder('Never'),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('active')
                    ->queries(
                        true: fn ($query) => $query->whereNull('left_at'),
                        false: fn ($query) => $query->whereNotNull('left_at'),
                    ),
            ])
            ->defaultSort('joined_at', 'desc');
    }
}
