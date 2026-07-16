<?php

declare(strict_types=1);

namespace App\Filament\Resources\GroupResource\RelationManagers;

use App\Filament\Resources\LedgerResource;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class LedgersRelationManager extends RelationManager
{
    protected static string $relationship = 'ledgers';

    protected static ?string $title = 'Linked ledgers';

    public function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('title')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('currency_code')->label('Currency')->sortable(),
                Tables\Columns\IconColumn::make('sync_group_pets')->label('Sync pets')->boolean(),
                Tables\Columns\TextColumn::make('active_memberships_count')
                    ->label('Members')->counts('activeMemberships')->sortable(),
                Tables\Columns\TextColumn::make('transactions_count')
                    ->label('Transactions')->counts('transactions')->sortable(),
                Tables\Columns\TextColumn::make('archived_at')->dateTime()->placeholder('Active')->sortable(),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('archived')
                    ->queries(
                        true: fn (Builder $query): Builder => $query->whereNotNull('archived_at'),
                        false: fn (Builder $query): Builder => $query->whereNull('archived_at'),
                    ),
                Tables\Filters\TernaryFilter::make('sync_group_pets'),
            ])
            ->recordUrl(fn ($record): string => LedgerResource::getUrl('view', ['record' => $record]))
            ->defaultSort('title');
    }
}
