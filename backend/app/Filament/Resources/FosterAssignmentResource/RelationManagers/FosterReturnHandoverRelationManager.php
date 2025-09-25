<?php

namespace App\Filament\Resources\FosterAssignmentResource\RelationManagers;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Actions\Action;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\BooleanColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class FosterReturnHandoverRelationManager extends RelationManager
{
    protected static string $relationship = 'fosterReturnHandover';

    protected static ?string $title = 'Foster Return Handover';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Section::make('Handover Details')
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

                        DateTimePicker::make('scheduled_at')
                            ->label('Scheduled At')
                            ->required(),

                        TextInput::make('location')
                            ->label('Location')
                            ->maxLength(255),

                        Select::make('status')
                            ->label('Status')
                            ->options([
                                'pending' => 'Pending',
                                'confirmed' => 'Confirmed',
                                'completed' => 'Completed',
                                'canceled' => 'Canceled',
                                'disputed' => 'Disputed',
                            ])
                            ->required()
                            ->default('pending'),
                    ])
                    ->columns(2),

                Section::make('Timeline')
                    ->schema([
                        DateTimePicker::make('foster_initiated_at')
                            ->label('Foster Initiated At')
                            ->nullable(),

                        DateTimePicker::make('owner_confirmed_at')
                            ->label('Owner Confirmed At')
                            ->nullable(),

                        DateTimePicker::make('completed_at')
                            ->label('Completed At')
                            ->nullable(),

                        DateTimePicker::make('canceled_at')
                            ->label('Canceled At')
                            ->nullable(),
                    ])
                    ->columns(2),

                Section::make('Condition Assessment')
                    ->schema([
                        Toggle::make('condition_confirmed')
                            ->label('Condition Confirmed')
                            ->default(false),

                        Textarea::make('condition_notes')
                            ->label('Condition Notes')
                            ->rows(3)
                            ->columnSpanFull(),
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

                TextColumn::make('scheduled_at')
                    ->label('Scheduled')
                    ->dateTime()
                    ->sortable(),

                TextColumn::make('location')
                    ->label('Location')
                    ->limit(30),

                BadgeColumn::make('status')
                    ->label('Status')
                    ->colors([
                        'warning' => 'pending',
                        'primary' => 'confirmed',
                        'success' => 'completed',
                        'danger' => 'canceled',
                        'secondary' => 'disputed',
                    ]),

                BooleanColumn::make('condition_confirmed')
                    ->label('Condition OK')
                    ->trueIcon('heroicon-o-check-circle')
                    ->falseIcon('heroicon-o-x-circle'),

                TextColumn::make('completed_at')
                    ->label('Completed')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(),

                TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'pending' => 'Pending',
                        'confirmed' => 'Confirmed',
                        'completed' => 'Completed',
                        'canceled' => 'Canceled',
                        'disputed' => 'Disputed',
                    ]),
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make(),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),

                Action::make('confirm')
                    ->label('Confirm')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->visible(fn ($record) => $record->status === 'pending')
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $record->update([
                            'status' => 'confirmed',
                            'owner_confirmed_at' => now(),
                        ]);

                        Notification::make()
                            ->title('Handover confirmed')
                            ->success()
                            ->send();
                    }),

                Action::make('complete')
                    ->label('Complete')
                    ->icon('heroicon-o-check-circle')
                    ->color('primary')
                    ->visible(fn ($record) => in_array($record->status, ['pending', 'confirmed']))
                    ->form([
                        Toggle::make('condition_confirmed')
                            ->label('Condition Confirmed')
                            ->default(true),
                        Textarea::make('condition_notes')
                            ->label('Condition Notes')
                            ->rows(3),
                    ])
                    ->action(function ($record, array $data) {
                        $record->update([
                            'status' => 'completed',
                            'completed_at' => now(),
                            'condition_confirmed' => $data['condition_confirmed'],
                            'condition_notes' => $data['condition_notes'],
                        ]);

                        Notification::make()
                            ->title('Handover completed')
                            ->success()
                            ->send();
                    }),

                Action::make('cancel')
                    ->label('Cancel')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->visible(fn ($record) => in_array($record->status, ['pending', 'confirmed']))
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $record->update([
                            'status' => 'canceled',
                            'canceled_at' => now(),
                        ]);

                        Notification::make()
                            ->title('Handover canceled')
                            ->success()
                            ->send();
                    }),

                Action::make('dispute')
                    ->label('Mark Disputed')
                    ->icon('heroicon-o-exclamation-triangle')
                    ->color('warning')
                    ->visible(fn ($record) => in_array($record->status, ['pending', 'confirmed', 'completed']))
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $record->update([
                            'status' => 'disputed',
                        ]);

                        Notification::make()
                            ->title('Handover marked as disputed')
                            ->warning()
                            ->send();
                    }),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }
}
