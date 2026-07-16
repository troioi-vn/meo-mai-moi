<?php

declare(strict_types=1);

namespace App\Filament\Resources\LedgerResource\RelationManagers;

use App\Enums\LedgerCategoryApplicability;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class CategoriesRelationManager extends RelationManager
{
    protected static string $relationship = 'categories';

    public function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('applies_to')->badge()->sortable(),
                Tables\Columns\TextColumn::make('transactions_count')->label('Transactions')->counts('transactions')->sortable(),
                Tables\Columns\TextColumn::make('archived_at')->dateTime()->placeholder('Active')->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('applies_to')->options(LedgerCategoryApplicability::class),
                Tables\Filters\TernaryFilter::make('archived')
                    ->queries(
                        true: fn (Builder $query): Builder => $query->whereNotNull('archived_at'),
                        false: fn (Builder $query): Builder => $query->whereNull('archived_at'),
                    ),
            ])
            ->defaultSort('name');
    }
}
