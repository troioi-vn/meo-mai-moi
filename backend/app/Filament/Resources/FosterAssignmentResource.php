<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FosterAssignmentResource\Pages;
use App\Filament\Resources\FosterAssignmentResource\RelationManagers;
use App\Models\FosterAssignment;
use Filament\Forms;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Select;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Actions\Action;
use Filament\Tables\Actions\BulkActionGroup;
use Filament\Tables\Actions\DeleteBulkAction;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class FosterAssignmentResource extends Resource
{
    protected static ?string $model = FosterAssignment::class;

    protected static ?string $navigationIcon = 'heroicon-o-heart';

    protected static ?string $navigationGroup = 'Pet Management';

    protected static ?string $navigationLabel = 'Foster Assignments';

    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Section::make('Assignment Details')
                    ->schema([
                        Select::make('pet_id')
                            ->label('Pet')
                            ->relationship('pet', 'name')
                            ->searchable()
                            ->preload()
                            ->required()
                            ->getOptionLabelFromRecordUsing(fn ($record) => "{$record->name} ({$record->petType->name}) (ID: {$record->id})"),

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
                            ->getOptionLabelFromRecordUsing(function ($record) {
                                $petName = $record->placementRequest->pet->name ?? 'Unknown Pet';

                                return "#{$record->id} - {$petName}";
                            }),
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

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('id')
                    ->label('ID')
                    ->sortable()
                    ->searchable(),

                TextColumn::make('pet.name')
                    ->label('Pet')
                    ->sortable()
                    ->searchable()
                    ->description(fn ($record) => $record->pet?->petType?->name)
                    ->url(fn ($record) => $record->pet ? route('filament.admin.resources.pets.edit', $record->pet) : null),

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
                    ->sortable()
                    ->toggleable(),

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

                TextColumn::make('updated_at')
                    ->label('Updated')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->options([
                        'active' => 'Active',
                        'completed' => 'Completed',
                        'canceled' => 'Canceled',
                    ]),

                Tables\Filters\Filter::make('start_date_from')
                    ->form([
                        Forms\Components\DatePicker::make('start_date_from')
                            ->label('Start Date From'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['start_date_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('start_date', '>=', $date),
                            );
                    }),

                Tables\Filters\Filter::make('start_date_until')
                    ->form([
                        Forms\Components\DatePicker::make('start_date_until')
                            ->label('Start Date Until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['start_date_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('start_date', '<=', $date),
                            );
                    }),

                Tables\Filters\Filter::make('active_assignments')
                    ->label('Active Assignments')
                    ->query(fn (Builder $query): Builder => $query->where('status', 'active'))
                    ->toggle(),

                Tables\Filters\Filter::make('overdue_assignments')
                    ->label('Overdue Assignments')
                    ->query(fn (Builder $query): Builder => $query->where('status', 'active')
                        ->whereNotNull('expected_end_date')
                        ->whereDate('expected_end_date', '<', now())
                    )
                    ->toggle(),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),

                Action::make('complete')
                    ->label('Mark Complete')
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
                            ->title('Foster assignment marked as completed')
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

                Action::make('reactivate')
                    ->label('Reactivate')
                    ->icon('heroicon-o-arrow-path')
                    ->color('warning')
                    ->visible(fn ($record) => in_array($record->status, ['completed', 'canceled']))
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $record->update([
                            'status' => 'active',
                            'completed_at' => null,
                            'canceled_at' => null,
                        ]);

                        Notification::make()
                            ->title('Foster assignment reactivated')
                            ->success()
                            ->send();
                    }),

                Action::make('extend_date')
                    ->label('Extend Date')
                    ->icon('heroicon-o-calendar-days')
                    ->color('primary')
                    ->visible(fn ($record) => $record->status === 'active')
                    ->form([
                        DatePicker::make('new_expected_end_date')
                            ->label('New Expected End Date')
                            ->required()
                            ->default(fn ($record) => $record->expected_end_date),
                    ])
                    ->action(function ($record, array $data) {
                        $record->update([
                            'expected_end_date' => $data['new_expected_end_date'],
                        ]);

                        Notification::make()
                            ->title('Foster assignment date extended')
                            ->success()
                            ->send();
                    }),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),

                    Tables\Actions\BulkAction::make('complete_selected')
                        ->label('Complete Selected')
                        ->icon('heroicon-o-check-circle')
                        ->color('success')
                        ->requiresConfirmation()
                        ->action(function ($records) {
                            $count = 0;
                            foreach ($records as $record) {
                                if ($record->status === 'active') {
                                    $record->update([
                                        'status' => 'completed',
                                        'completed_at' => now(),
                                    ]);
                                    $count++;
                                }
                            }

                            Notification::make()
                                ->title("{$count} foster assignments completed")
                                ->success()
                                ->send();
                        }),

                    Tables\Actions\BulkAction::make('cancel_selected')
                        ->label('Cancel Selected')
                        ->icon('heroicon-o-x-circle')
                        ->color('danger')
                        ->requiresConfirmation()
                        ->action(function ($records) {
                            $count = 0;
                            foreach ($records as $record) {
                                if ($record->status === 'active') {
                                    $record->update([
                                        'status' => 'canceled',
                                        'canceled_at' => now(),
                                    ]);
                                    $count++;
                                }
                            }

                            Notification::make()
                                ->title("{$count} foster assignments canceled")
                                ->success()
                                ->send();
                        }),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\FosterReturnHandoverRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListFosterAssignments::route('/'),
            'create' => Pages\CreateFosterAssignment::route('/create'),
            'view' => Pages\ViewFosterAssignment::route('/{record}'),
            'edit' => Pages\EditFosterAssignment::route('/{record}/edit'),
        ];
    }
}
