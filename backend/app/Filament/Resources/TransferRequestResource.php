<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\TransferRequestResource\Pages;
use App\Models\TransferRequest;
use Filament\Forms;
use Filament\Forms\Components\DateTimePicker;
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

class TransferRequestResource extends Resource
{
    protected static ?string $model = TransferRequest::class;

    protected static ?string $navigationIcon = 'heroicon-o-arrow-path';

    protected static ?string $navigationGroup = 'Pet Management';

    protected static ?string $navigationLabel = 'Transfer Requests';

    protected static ?int $navigationSort = 4;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Select::make('placement_request_id')
                    ->label('Placement Request')
                    ->relationship('placementRequest', 'id')
                    ->getOptionLabelFromRecordUsing(function ($record) {
                        $petName = optional($record->pet)->name;
                        if ($petName) {
                            return "#{$record->id} - {$petName} ({$record->request_type->value})";
                        }

                        return "#{$record->id}";
                    })
                    ->searchable()
                    ->preload()
                    ->required(),

                Select::make('from_user_id')
                    ->label('From User (Owner)')
                    ->relationship('fromUser', 'name')
                    ->searchable()
                    ->preload()
                    ->required(),

                Select::make('to_user_id')
                    ->label('To User (Helper)')
                    ->relationship('toUser', 'name')
                    ->searchable()
                    ->preload()
                    ->required(),

                Select::make('status')
                    ->label('Status')
                    ->options([
                        'pending' => 'Pending',
                        'confirmed' => 'Confirmed',
                        'rejected' => 'Rejected',
                        'expired' => 'Expired',
                        'canceled' => 'Canceled',
                    ])
                    ->required()
                    ->default('pending'),

                DateTimePicker::make('confirmed_at')
                    ->label('Confirmed At')
                    ->nullable(),

                DateTimePicker::make('rejected_at')
                    ->label('Rejected At')
                    ->nullable(),
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

                TextColumn::make('placementRequest.pet.name')
                    ->label('Pet')
                    ->formatStateUsing(fn ($state, $record) => $record->placementRequest?->pet?->name)
                    ->sortable()
                    ->searchable()
                    ->description(fn ($record) => $record->placementRequest?->pet?->petType?->name)
                    ->url(fn ($record) => $record->placementRequest?->pet ? route('filament.admin.resources.pets.edit', $record->placementRequest->pet) : null),

                TextColumn::make('fromUser.name')
                    ->label('From (Owner)')
                    ->sortable()
                    ->searchable(),

                TextColumn::make('toUser.name')
                    ->label('To (Helper)')
                    ->sortable()
                    ->searchable(),

                BadgeColumn::make('status')
                    ->label('Status')
                    ->colors([
                        'warning' => 'pending',
                        'success' => 'confirmed',
                        'danger' => 'rejected',
                        'secondary' => 'expired',
                        'gray' => 'canceled',
                    ]),

                TextColumn::make('confirmed_at')
                    ->label('Confirmed Date')
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
                        'pending' => 'Pending',
                        'confirmed' => 'Confirmed',
                        'rejected' => 'Rejected',
                        'expired' => 'Expired',
                        'canceled' => 'Canceled',
                    ]),

                Tables\Filters\Filter::make('created_from')
                    ->form([
                        Forms\Components\DatePicker::make('created_from')
                            ->label('Created From'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['created_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('created_at', '>=', $date),
                            );
                    }),

                Tables\Filters\Filter::make('created_until')
                    ->form([
                        Forms\Components\DatePicker::make('created_until')
                            ->label('Created Until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['created_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('created_at', '<=', $date),
                            );
                    }),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),

                Action::make('confirm')
                    ->label('Confirm Transfer')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->visible(fn ($record) => $record->status->value === 'pending')
                    ->requiresConfirmation()
                    ->action(function ($record): void {
                        $record->update([
                            'status' => 'confirmed',
                            'confirmed_at' => now(),
                        ]);

                        Notification::make()
                            ->title('Transfer confirmed')
                            ->success()
                            ->send();
                    }),

                Action::make('reject')
                    ->label('Reject')
                    ->icon('heroicon-o-x-mark')
                    ->color('danger')
                    ->visible(fn ($record) => $record->status->value === 'pending')
                    ->requiresConfirmation()
                    ->action(function ($record): void {
                        $record->update([
                            'status' => 'rejected',
                            'rejected_at' => now(),
                        ]);

                        Notification::make()
                            ->title('Transfer request rejected')
                            ->success()
                            ->send();
                    }),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),

                    Tables\Actions\BulkAction::make('confirm_selected')
                        ->label('Confirm Selected')
                        ->icon('heroicon-o-check')
                        ->color('success')
                        ->requiresConfirmation()
                        ->action(function ($records): void {
                            $count = 0;
                            foreach ($records as $record) {
                                if ($record->status->value === 'pending') {
                                    $record->update([
                                        'status' => 'confirmed',
                                        'confirmed_at' => now(),
                                    ]);
                                    $count++;
                                }
                            }

                            Notification::make()
                                ->title("{$count} transfers confirmed")
                                ->success()
                                ->send();
                        }),

                    Tables\Actions\BulkAction::make('reject_selected')
                        ->label('Reject Selected')
                        ->icon('heroicon-o-x-mark')
                        ->color('danger')
                        ->requiresConfirmation()
                        ->action(function ($records): void {
                            $count = 0;
                            foreach ($records as $record) {
                                if ($record->status->value === 'pending') {
                                    $record->update([
                                        'status' => 'rejected',
                                        'rejected_at' => now(),
                                    ]);
                                    $count++;
                                }
                            }

                            Notification::make()
                                ->title("{$count} transfer requests rejected")
                                ->success()
                                ->send();
                        }),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        // TODO: TransferHandoverRelationManager removed - reimplment when rehoming flow is rebuilt
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListTransferRequests::route('/'),
            'create' => Pages\CreateTransferRequest::route('/create'),
            'view' => Pages\ViewTransferRequest::route('/{record}'),
            'edit' => Pages\EditTransferRequest::route('/{record}/edit'),
        ];
    }
}
