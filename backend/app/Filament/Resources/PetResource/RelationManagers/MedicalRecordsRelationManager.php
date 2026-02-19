<?php

declare(strict_types=1);

namespace App\Filament\Resources\PetResource\RelationManagers;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class MedicalRecordsRelationManager extends RelationManager
{
    protected static string $relationship = 'medicalRecords';

    protected static ?string $title = 'Medical Records';

    protected static ?string $recordTitleAttribute = 'record_type';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                TextInput::make('record_type')
                    ->label('Record Type')
                    ->required()
                    ->maxLength(100),

                DatePicker::make('record_date')
                    ->label('Record Date')
                    ->required()
                    ->maxDate(now()),

                TextInput::make('vet_name')
                    ->label('Veterinarian')
                    ->maxLength(255),

                Textarea::make('description')
                    ->label('Description')
                    ->rows(4)
                    ->columnSpanFull(),
            ])
            ->columns(2);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('record_type')
            ->columns([
                TextColumn::make('record_type')
                    ->label('Type')
                    ->badge()
                    ->searchable()
                    ->sortable(),

                TextColumn::make('record_date')
                    ->label('Date')
                    ->date()
                    ->sortable(),

                TextColumn::make('vet_name')
                    ->label('Veterinarian')
                    ->searchable()
                    ->placeholder('-'),

                TextColumn::make('description')
                    ->label('Description')
                    ->limit(60),

                TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make()
                    ->label('Add Medical Record'),
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
            ->emptyStateHeading('No medical records')
            ->emptyStateDescription('Add medical records for this pet.')
            ->emptyStateIcon('heroicon-o-clipboard-document-list');
    }
}
