<?php

namespace App\Filament\Resources\CatResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Section;
use Filament\Tables\Actions\Action;
use Filament\Notifications\Notification;

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
                            ->nullable()
                            ->getOptionLabelFromRecordUsing(fn ($record) => "#{$record->id} - " . ($record->placementRequest?->cat?->name ?? 'Unknown Cat')),
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
                            ->nullable()
                            ->visible(fn (Forms\Get $get) => $get('status') === 'completed'),

                        DateTimePicker::make('canceled_at')
                            ->label('Canceled At')
                            ->nullable()
                            ->visible(fn (Forms\Get $get) => $get('status') === 'canceled'),
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

                TextColumn::make('duration_in_days')
                    ->label('Duration')
                    ->getStateUsing(function ($record) {
                        if (!$record->start_date) {
                            return 'Not started';
                        }
                        
                        $endDate = $record->completed_at ?? $record->canceled_at ?? now();
                        $days = $record->start_date->diffInDays($endDate);
                        
                        return $days . ' days';
                    }),

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
                        'active' => 'Active',
                        'completed' => 'Completed',
                        'canceled' => 'Canceled',
                    ]),
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make(),
            ])
            ->actions([
                Tables\Actions\ViewAction::make()
                    ->url(fn ($record) => route('filament.admin.resources.foster-assignments.view', $record)),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),

                Action::make('complete')
                    ->label('Complete')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->visible(fn ($record) => $record->status === 'active')
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $record->update([
                            'status' => 'completed',
                            'completed_at' => now(),
                        ]);
                        
                        Notification::make()
                            ->title('Foster assignment completed')
                            ->success()
                            ->send();
                    }),

                Action::make('cancel')
                    ->label('Cancel')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->visible(fn ($record) => $record->status === 'active')
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $record->update([
                            'status' => 'canceled',
                            'canceled_at' => now(),
                        ]);
                        
                        Notification::make()
                            ->title('Foster assignment canceled')
                            ->success()
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