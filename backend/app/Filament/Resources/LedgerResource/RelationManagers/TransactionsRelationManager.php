<?php

declare(strict_types=1);

namespace App\Filament\Resources\LedgerResource\RelationManagers;

use App\Enums\LedgerTransactionType;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

class TransactionsRelationManager extends RelationManager
{
    protected static string $relationship = 'transactions';

    public function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('occurred_on')->date()->sortable(),
                Tables\Columns\TextColumn::make('type')->badge()->sortable(),
                Tables\Columns\TextColumn::make('amount_minor')->label('Amount (minor units)')->numeric()->sortable(),
                Tables\Columns\TextColumn::make('description')->searchable()->limit(60)->placeholder('—'),
                Tables\Columns\TextColumn::make('account.name')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('category.name')->searchable()->sortable()->placeholder('—'),
                Tables\Columns\TextColumn::make('creator.name')->label('Created by')->searchable()->toggleable(),
                Tables\Columns\TextColumn::make('deleted_at')->dateTime()->placeholder('Active')->toggleable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('type')->options(LedgerTransactionType::class),
                Tables\Filters\SelectFilter::make('account')->relationship('account', 'name')->searchable()->preload(),
                Tables\Filters\SelectFilter::make('category')->relationship('category', 'name')->searchable()->preload(),
                Tables\Filters\TrashedFilter::make(),
            ])
            ->defaultSort('occurred_on', 'desc');
    }
}
