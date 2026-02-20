<?php

declare(strict_types=1);

namespace App\Filament\Resources\PetResource\RelationManagers;

use Filament\Actions;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\TextInput;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class WeightHistoriesRelationManager extends RelationManager
{
    protected static string $relationship = 'weightHistories';

    protected static ?string $title = 'Weight Records';

    protected static ?string $recordTitleAttribute = 'record_date';

    public function isReadOnly(): bool
    {
        return false;
    }

    public function form(Schema $form): Schema
    {
        return $form
            ->schema([
                TextInput::make('weight_kg')
                    ->label('Weight (kg)')
                    ->numeric()
                    ->minValue(0.01)
                    ->maxValue(500)
                    ->step(0.01)
                    ->required()
                    ->suffix('kg'),

                DatePicker::make('record_date')
                    ->label('Record Date')
                    ->required()
                    ->maxDate(now())
                    ->default(now()),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('record_date')
            ->columns([
                TextColumn::make('weight_kg')
                    ->label('Weight')
                    ->formatStateUsing(function ($state): string {
                        if (! is_numeric($state)) {
                            return '-';
                        }

                        return number_format((float) $state, 2).' kg';
                    })
                    ->sortable(),

                TextColumn::make('record_date')
                    ->label('Date')
                    ->date()
                    ->sortable(),

                TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
            ])
            ->headerActions([
                Actions\CreateAction::make()
                    ->label('Add Weight Record'),
            ])
            ->actions([
                Actions\ViewAction::make(),
                Actions\EditAction::make(),
                Actions\DeleteAction::make()
                    ->requiresConfirmation(),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make()
                        ->requiresConfirmation(),
                ]),
            ])
            ->defaultSort('record_date', 'desc')
            ->emptyStateHeading('No weight records')
            ->emptyStateDescription('Add weight records to track this pet\'s weight over time.')
            ->emptyStateIcon('heroicon-o-scale');
    }
}
