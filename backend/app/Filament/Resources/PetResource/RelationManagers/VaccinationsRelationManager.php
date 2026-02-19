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

class VaccinationsRelationManager extends RelationManager
{
    protected static string $relationship = 'vaccinations';

    protected static ?string $title = 'Vaccinations';

    protected static ?string $recordTitleAttribute = 'vaccine_name';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                TextInput::make('vaccine_name')
                    ->label('Vaccine Name')
                    ->required()
                    ->maxLength(255),

                DatePicker::make('administered_at')
                    ->label('Administered At')
                    ->nullable(),

                DatePicker::make('due_at')
                    ->label('Due At')
                    ->nullable(),

                DatePicker::make('completed_at')
                    ->label('Completed At')
                    ->nullable(),

                Textarea::make('notes')
                    ->label('Notes')
                    ->rows(3)
                    ->columnSpanFull(),
            ])
            ->columns(2);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('vaccine_name')
            ->columns([
                TextColumn::make('vaccine_name')
                    ->label('Vaccine')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('administered_at')
                    ->label('Administered')
                    ->date()
                    ->sortable()
                    ->placeholder('-'),

                TextColumn::make('due_at')
                    ->label('Due')
                    ->date()
                    ->sortable()
                    ->placeholder('-'),

                TextColumn::make('completed_at')
                    ->label('Status')
                    ->badge()
                    ->formatStateUsing(fn ($state): string => $state ? 'Completed' : 'Active')
                    ->color(fn ($state): string => $state ? 'success' : 'warning'),

                TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make()
                    ->label('Add Vaccination'),
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
            ->defaultSort('administered_at', 'desc')
            ->emptyStateHeading('No vaccination records')
            ->emptyStateDescription('Add vaccination records for this pet.')
            ->emptyStateIcon('heroicon-o-shield-check');
    }
}
