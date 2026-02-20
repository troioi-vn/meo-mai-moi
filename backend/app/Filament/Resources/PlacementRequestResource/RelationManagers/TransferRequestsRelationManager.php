<?php

declare(strict_types=1);

namespace App\Filament\Resources\PlacementRequestResource\RelationManagers;

use App\Enums\TransferRequestStatus;
use App\Models\User;
use Filament\Actions;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class TransferRequestsRelationManager extends RelationManager
{
    protected static string $relationship = 'transferRequests';

    protected static ?string $title = 'Transfer Requests';

    protected static ?string $modelLabel = 'Transfer Request';

    public function form(Schema $form): Schema
    {
        return $form
            ->schema([
                Select::make('from_user_id')
                    ->label('From User (Owner)')
                    ->relationship('fromUser', 'name')
                    ->searchable()
                    ->preload()
                    ->required()
                    ->getOptionLabelFromRecordUsing(fn (User $record): string => "{$record->name} ({$record->email})"),

                Select::make('to_user_id')
                    ->label('To User (Helper)')
                    ->relationship('toUser', 'name')
                    ->searchable()
                    ->preload()
                    ->required()
                    ->getOptionLabelFromRecordUsing(fn (User $record): string => "{$record->name} ({$record->email})"),

                Select::make('status')
                    ->options(TransferRequestStatus::class)
                    ->required()
                    ->default(TransferRequestStatus::PENDING),

                DateTimePicker::make('confirmed_at')
                    ->label('Confirmed At'),

                DateTimePicker::make('rejected_at')
                    ->label('Rejected At'),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('id')
            ->columns([
                TextColumn::make('fromUser.name')
                    ->label('From (Owner)')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('toUser.name')
                    ->label('To (Helper)')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('status')
                    ->badge(),

                TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->since(),

                TextColumn::make('confirmed_at')
                    ->label('Confirmed')
                    ->dateTime()
                    ->placeholder('N/A')
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('rejected_at')
                    ->label('Rejected')
                    ->dateTime()
                    ->placeholder('N/A')
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'pending' => 'Pending',
                        'confirmed' => 'Confirmed',
                        'rejected' => 'Rejected',
                        'expired' => 'Expired',
                        'canceled' => 'Canceled',
                    ]),
            ])
            ->headerActions([
                Actions\CreateAction::make(),
            ])
            ->actions([
                Actions\EditAction::make(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }
}
