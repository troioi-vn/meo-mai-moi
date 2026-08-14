<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Enums\TransferRequestStatus;
use App\Filament\Resources\TransferRequestResource\Pages;
use App\Models\TransferRequest;
use App\Models\User;
use App\Services\TransferRequestLifecycleService;
use Filament\Actions\Action;
use Filament\Actions\BulkAction;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\ViewAction;
use Filament\Forms;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class TransferRequestResource extends Resource
{
    protected static ?string $model = TransferRequest::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-arrow-path';

    protected static string|\UnitEnum|null $navigationGroup = 'Pets data';

    protected static ?int $navigationSort = 2;

    public static function form(Schema $form): Schema
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
                    ->options(TransferRequestStatus::class)
                    ->required()
                    ->default(TransferRequestStatus::PENDING->value),

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

                TextColumn::make('status')
                    ->label('Status')
                    ->badge(),

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
                    ->options(TransferRequestStatus::class),

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
                ViewAction::make(),
                Action::make('confirm')
                    ->label('Confirm Transfer')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->visible(fn ($record) => $record->status === TransferRequestStatus::PENDING)
                    ->requiresConfirmation()
                    ->action(function ($record): void {
                        /** @var User $actor */
                        $actor = auth()->user();
                        $confirmed = app(TransferRequestLifecycleService::class)->confirm($record, $actor);

                        Notification::make()
                            ->title($confirmed ? 'Transfer confirmed' : 'Transfer could not be confirmed')
                            ->color($confirmed ? 'success' : 'danger')
                            ->send();
                    }),

                Action::make('reject')
                    ->label('Reject')
                    ->icon('heroicon-o-x-mark')
                    ->color('danger')
                    ->visible(fn ($record) => $record->status === TransferRequestStatus::PENDING)
                    ->requiresConfirmation()
                    ->action(function ($record): void {
                        $rejected = app(TransferRequestLifecycleService::class)->reject($record);

                        Notification::make()
                            ->title($rejected ? 'Transfer request rejected' : 'Transfer request could not be rejected')
                            ->color($rejected ? 'success' : 'danger')
                            ->send();
                    }),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    BulkAction::make('confirm_selected')
                        ->label('Confirm Selected')
                        ->icon('heroicon-o-check')
                        ->color('success')
                        ->requiresConfirmation()
                        ->action(function ($records): void {
                            $count = 0;
                            foreach ($records as $record) {
                                /** @var User $actor */
                                $actor = auth()->user();
                                if (
                                    $record->status === TransferRequestStatus::PENDING
                                    && app(TransferRequestLifecycleService::class)->confirm($record, $actor)
                                ) {
                                    $count++;
                                }
                            }

                            Notification::make()
                                ->title("{$count} transfers confirmed")
                                ->success()
                                ->send();
                        }),

                    BulkAction::make('reject_selected')
                        ->label('Reject Selected')
                        ->icon('heroicon-o-x-mark')
                        ->color('danger')
                        ->requiresConfirmation()
                        ->action(function ($records): void {
                            $count = 0;
                            foreach ($records as $record) {
                                if (app(TransferRequestLifecycleService::class)->reject($record)) {
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
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListTransferRequests::route('/'),
            'view' => Pages\ViewTransferRequest::route('/{record}'),
        ];
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit(Model $record): bool
    {
        return false;
    }

    public static function canDelete(Model $record): bool
    {
        return false;
    }
}
