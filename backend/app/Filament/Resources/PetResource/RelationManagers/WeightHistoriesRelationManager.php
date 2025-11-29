<?php

namespace App\Filament\Resources\PetResource\RelationManagers;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
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

    public function form(Form $form): Form
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
                    ->formatStateUsing(fn ($state) => number_format($state, 2) . ' kg')
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
                //
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make()
                    ->label('Add Weight Record'),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make()
                    ->requiresConfirmation(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make()
                        ->requiresConfirmation(),
                ]),
            ])
            ->defaultSort('record_date', 'desc')
            ->emptyStateHeading('No weight records')
            ->emptyStateDescription('Add weight records to track this pet\'s weight over time.')
            ->emptyStateIcon('heroicon-o-scale');
    }
}

