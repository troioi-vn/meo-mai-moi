<?php

declare(strict_types=1);

namespace App\Filament\Resources\PetResource\RelationManagers;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class MicrochipsRelationManager extends RelationManager
{
    protected static string $relationship = 'microchips';

    protected static ?string $title = 'Microchips';

    protected static ?string $recordTitleAttribute = 'chip_number';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                TextInput::make('chip_number')
                    ->label('Microchip Number')
                    ->required()
                    ->maxLength(255),

                TextInput::make('issuer')
                    ->label('Issuer')
                    ->maxLength(255),

                DatePicker::make('implanted_at')
                    ->label('Implanted At')
                    ->nullable()
                    ->maxDate(now()),
            ])
            ->columns(2);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('chip_number')
            ->columns([
                TextColumn::make('chip_number')
                    ->label('Microchip Number')
                    ->searchable()
                    ->sortable()
                    ->copyable()
                    ->copyMessage('Microchip number copied'),

                TextColumn::make('issuer')
                    ->label('Issuer')
                    ->placeholder('-')
                    ->searchable(),

                TextColumn::make('implanted_at')
                    ->label('Implanted')
                    ->date()
                    ->sortable()
                    ->placeholder('-'),

                TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make()
                    ->label('Add Microchip'),
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
            ->defaultSort('implanted_at', 'desc')
            ->emptyStateHeading('No microchips')
            ->emptyStateDescription('Add microchip information for this pet.')
            ->emptyStateIcon('heroicon-o-identification');
    }
}
