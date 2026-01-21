<?php

declare(strict_types=1);

namespace App\Filament\Resources\PlacementRequestResource\RelationManagers;

use App\Enums\PlacementResponseStatus;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class ResponsesRelationManager extends RelationManager
{
    protected static string $relationship = 'responses';

    protected static ?string $title = 'Helper Responses';

    protected static ?string $modelLabel = 'Response';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Select::make('helper_profile_id')
                    ->label('Helper Profile')
                    ->relationship('helperProfile', 'id')
                    ->getOptionLabelFromRecordUsing(fn ($record) => $record->user->name." ({$record->country})")
                    ->searchable()
                    ->preload()
                    ->required(),

                Select::make('status')
                    ->options(PlacementResponseStatus::class)
                    ->required()
                    ->default(PlacementResponseStatus::RESPONDED),

                Textarea::make('message')
                    ->label('Message')
                    ->rows(3)
                    ->columnSpanFull(),

                DateTimePicker::make('responded_at')
                    ->label('Responded At')
                    ->default(now()),

                DateTimePicker::make('accepted_at')
                    ->label('Accepted At'),

                DateTimePicker::make('rejected_at')
                    ->label('Rejected At'),

                DateTimePicker::make('cancelled_at')
                    ->label('Cancelled At'),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('id')
            ->columns([
                TextColumn::make('helperProfile.user.name')
                    ->label('Helper')
                    ->searchable()
                    ->sortable()
                    ->url(fn ($record) => $record->helperProfile ? route('filament.admin.resources.helper-profiles.view', $record->helperProfile) : null),

                TextColumn::make('helperProfile.country')
                    ->label('Country')
                    ->sortable(),

                TextColumn::make('status')
                    ->badge(),

                TextColumn::make('message')
                    ->label('Message')
                    ->limit(30)
                    ->tooltip(fn ($record) => $record->message)
                    ->placeholder('No message'),

                TextColumn::make('responded_at')
                    ->label('Responded')
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

                TextColumn::make('cancelled_at')
                    ->label('Cancelled')
                    ->dateTime()
                    ->placeholder('N/A')
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        PlacementResponseStatus::RESPONDED->value => 'Responded',
                        PlacementResponseStatus::ACCEPTED->value => 'Accepted',
                        PlacementResponseStatus::REJECTED->value => 'Rejected',
                        PlacementResponseStatus::CANCELLED->value => 'Cancelled',
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
            ->defaultSort('responded_at', 'desc');
    }
}
