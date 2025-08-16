<?php

namespace App\Filament\Resources\TransferRequestResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\IconColumn;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Toggle;
use Filament\Tables\Actions\Action;
use Filament\Notifications\Notification;

class TransferHandoverRelationManager extends RelationManager
{
    protected static string $relationship = 'transferHandover';

    protected static ?string $title = 'Transfer Handover';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Select::make('owner_user_id')
                    ->label('Owner')
                    ->relationship('owner', 'name')
                    ->searchable()
                    ->preload()
                    ->required(),

                Select::make('helper_user_id')
                    ->label('Helper')
                    ->relationship('helper', 'name')
                    ->searchable()
                    ->preload()
                    ->required(),

                DateTimePicker::make('scheduled_at')
                    ->label('Scheduled At')
                    ->nullable(),

                Forms\Components\TextInput::make('location')
                    ->label('Location')
                    ->maxLength(255)
                    ->nullable(),

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

                DateTimePicker::make('owner_initiated_at')
                    ->label('Owner Initiated At')
                    ->nullable(),

                DateTimePicker::make('helper_confirmed_at')
                    ->label('Helper Confirmed At')
                    ->nullable(),

                Toggle::make('condition_confirmed')
                    ->label('Condition Confirmed')
                    ->default(false),

                Textarea::make('condition_notes')
                    ->label('Condition Notes')
                    ->rows(3)
                    ->nullable(),

                DateTimePicker::make('completed_at')
                    ->label('Completed At')
                    ->nullable(),

                DateTimePicker::make('canceled_at')
                    ->label('Canceled At')
                    ->nullable(),
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

                TextColumn::make('owner.name')
                    ->label('Owner')
                    ->sortable()
                    ->searchable(),

                TextColumn::make('helper.name')
                    ->label('Helper')
                    ->sortable()
                    ->searchable(),

                TextColumn::make('scheduled_at')
                    ->label('Scheduled')
                    ->dateTime()
                    ->sortable(),

                TextColumn::make('location')
                    ->label('Location')
                    ->limit(30)
                    ->tooltip(function (TextColumn $column): ?string {
                        $state = $column->getState();
                        if (strlen($state) <= 30) {
                            return null;
                        }
                        return $state;
                    }),

                BadgeColumn::make('status')
                    ->label('Status')
                    ->colors([
                        'warning' => 'pending',
                        'info' => 'confirmed',
                        'success' => 'completed',
                        'danger' => 'canceled',
                        'secondary' => 'disputed',
                    ]),

                IconColumn::make('condition_confirmed')
                    ->label('Condition OK')
                    ->boolean()
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
                Tables\Actions\CreateAction::make()
                    ->mutateFormDataUsing(function (array $data): array {
                        // Auto-populate owner and helper from the transfer request
                        $transferRequest = $this->getOwnerRecord();
                        if ($transferRequest->placementRequest) {
                            $data['owner_user_id'] = $transferRequest->placementRequest->user_id;
                        }
                        if ($transferRequest->helperProfile) {
                            $data['helper_user_id'] = $transferRequest->helperProfile->user_id;
                        }
                        return $data;
                    }),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
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
                            'helper_confirmed_at' => now(),
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
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $record->update([
                            'status' => 'completed',
                            'completed_at' => now(),
                        ]);
                        
                        Notification::make()
                            ->title('Handover completed')
                            ->success()
                            ->send();
                    }),

                Action::make('cancel')
                    ->label('Cancel')
                    ->icon('heroicon-o-x-mark')
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