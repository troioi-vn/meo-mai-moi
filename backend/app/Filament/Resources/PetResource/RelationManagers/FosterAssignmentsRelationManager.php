<?php

namespace App\Filament\Resources\PetResource\RelationManagers;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Select;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class FosterAssignmentsRelationManager extends RelationManager
{
    protected static string $relationship = 'fosterAssignments';

    protected static ?string $title = 'Foster History';

    protected static ?string $recordTitleAttribute = 'id';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Section::make('Assignment Details')
                    ->schema([
                        Select::make('owner_user_id')
                            ->label('Owner')
                            ->relationship('owner', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),

                        Select::make('foster_user_id')
                            ->label('Foster Parent')
                            ->relationship('fosterer', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),

                        Select::make('transfer_request_id')
                            ->label('Transfer Request')
                            ->relationship('transferRequest', 'id')
                            ->searchable()
                            ->preload()
                            ->nullable(),
                    ])
                    ->columns(2),

                Section::make('Timeline & Status')
                    ->schema([
                        Select::make('status')
                            ->label('Status')
                            ->options([
                                'active' => 'Active',
                                'completed' => 'Completed',
                                'canceled' => 'Canceled',
                            ])
                            ->required()
                            ->default('active'),

                        DatePicker::make('start_date')
                            ->label('Start Date')
                            ->nullable(),

                        DatePicker::make('expected_end_date')
                            ->label('Expected End Date')
                            ->nullable(),

                        DateTimePicker::make('completed_at')
                            ->label('Completed At')
                            ->nullable(),

                        DateTimePicker::make('canceled_at')
                            ->label('Canceled At')
                            ->nullable(),
                    ])
                    ->columns(2),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('id')
            ->columns([
                TextColumn::make('id')
                    ->label('ID')
                    ->sortable(),

                TextColumn::make('fosterer.name')
                    ->label('Foster Parent')
                    ->sortable()
                    ->searchable(),

                TextColumn::make('owner.name')
                    ->label('Owner')
                    ->sortable()
                    ->searchable(),

                BadgeColumn::make('status')
                    ->label('Status')
                    ->colors([
                        'success' => 'active',
                        'primary' => 'completed',
                        'danger' => 'canceled',
                    ]),

                TextColumn::make('start_date')
                    ->label('Start Date')
                    ->date()
                    ->sortable(),

                TextColumn::make('expected_end_date')
                    ->label('Expected End')
                    ->date()
                    ->sortable(),

                TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'active' => 'Active',
                        'completed' => 'Completed',
                        'canceled' => 'Canceled',
                    ]),
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make(),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }
}
