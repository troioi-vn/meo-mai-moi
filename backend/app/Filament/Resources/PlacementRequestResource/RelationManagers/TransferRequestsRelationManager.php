<?php

namespace App\Filament\Resources\PlacementRequestResource\RelationManagers;

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
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\DateTimePicker;
use App\Models\User;
use App\Models\HelperProfile;

class TransferRequestsRelationManager extends RelationManager
{
    protected static string $relationship = 'transferRequests';

    protected static ?string $title = 'Transfer Requests';

    protected static ?string $modelLabel = 'Transfer Request';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Select::make('requester_id')
                    ->label('Requester')
                    ->relationship('requester', 'name')
                    ->searchable()
                    ->preload()
                    ->required()
                    ->getOptionLabelFromRecordUsing(fn (User $record): string => "{$record->name} ({$record->email})"),

                Select::make('helper_profile_id')
                    ->label('Helper Profile')
                    ->relationship('helperProfile.user', 'name')
                    ->searchable()
                    ->preload(),

                Select::make('status')
                    ->options([
                        'pending' => 'Pending',
                        'accepted' => 'Accepted',
                        'rejected' => 'Rejected',
                        'completed' => 'Completed',
                    ])
                    ->required()
                    ->default('pending'),

                Select::make('requested_relationship_type')
                    ->label('Relationship Type')
                    ->options([
                        'foster' => 'Foster',
                        'adopt' => 'Adopt',
                        'temporary' => 'Temporary Care',
                    ]),

                Select::make('fostering_type')
                    ->label('Fostering Type')
                    ->options([
                        'short_term' => 'Short Term',
                        'long_term' => 'Long Term',
                        'emergency' => 'Emergency',
                    ])
                    ->visible(fn (Forms\Get $get): bool => $get('requested_relationship_type') === 'foster'),

                Forms\Components\TextInput::make('price')
                    ->label('Price')
                    ->numeric()
                    ->prefix('$'),

                DateTimePicker::make('accepted_at')
                    ->label('Accepted At'),

                DateTimePicker::make('rejected_at')
                    ->label('Rejected At'),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('id')
            ->columns([
                TextColumn::make('requester.name')
                    ->label('Requester')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('helperProfile.user.name')
                    ->label('Helper')
                    ->searchable()
                    ->sortable()
                    ->placeholder('N/A'),

                BadgeColumn::make('status')
                    ->colors([
                        'warning' => 'pending',
                        'success' => 'accepted',
                        'danger' => 'rejected',
                        'info' => 'completed',
                    ]),

                TextColumn::make('requested_relationship_type')
                    ->label('Type')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'foster' => 'Foster',
                        'adopt' => 'Adopt',
                        'temporary' => 'Temporary',
                        default => $state,
                    }),

                TextColumn::make('price')
                    ->label('Price')
                    ->money('USD')
                    ->placeholder('Free'),

                TextColumn::make('created_at')
                    ->label('Requested')
                    ->dateTime()
                    ->sortable()
                    ->since(),

                TextColumn::make('accepted_at')
                    ->label('Accepted')
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
                        'accepted' => 'Accepted',
                        'rejected' => 'Rejected',
                        'completed' => 'Completed',
                    ]),

                Tables\Filters\SelectFilter::make('requested_relationship_type')
                    ->label('Relationship Type')
                    ->options([
                        'foster' => 'Foster',
                        'adopt' => 'Adopt',
                        'temporary' => 'Temporary',
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