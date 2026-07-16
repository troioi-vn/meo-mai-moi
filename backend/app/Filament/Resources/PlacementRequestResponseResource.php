<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Enums\PlacementResponseStatus;
use App\Filament\Resources\PlacementRequestResponseResource\Pages;
use App\Models\PlacementRequestResponse;
use Filament\Actions\ViewAction;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class PlacementRequestResponseResource extends Resource
{
    protected static ?string $model = PlacementRequestResponse::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-chat-bubble-left-ellipsis';

    protected static string|\UnitEnum|null $navigationGroup = 'Pets data';

    protected static ?string $navigationLabel = 'Placement Responses';

    public static function form(Schema $form): Schema
    {
        return $form->schema([
            Forms\Components\TextInput::make('placement_request_id')->disabled(),
            Forms\Components\TextInput::make('helperProfile.user.name')
                ->label('Helper')
                ->disabled(),
            Forms\Components\TextInput::make('status')->disabled(),
            Forms\Components\Textarea::make('message')
                ->rows(5)
                ->columnSpanFull()
                ->disabled(),
            Forms\Components\DateTimePicker::make('responded_at')->disabled(),
            Forms\Components\DateTimePicker::make('accepted_at')->disabled(),
            Forms\Components\DateTimePicker::make('rejected_at')->disabled(),
            Forms\Components\DateTimePicker::make('cancelled_at')->disabled(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable(),
                Tables\Columns\TextColumn::make('placementRequest.id')
                    ->label('Placement')
                    ->url(fn (PlacementRequestResponse $record): string => PlacementRequestResource::getUrl('view', [
                        'record' => $record->placementRequest,
                    ]))
                    ->sortable(),
                Tables\Columns\TextColumn::make('placementRequest.pet.name')
                    ->label('Pet')
                    ->url(fn (PlacementRequestResponse $record): ?string => $record->placementRequest?->pet
                        ? PetResource::getUrl('edit', ['record' => $record->placementRequest->pet])
                        : null)
                    ->searchable(),
                Tables\Columns\TextColumn::make('helperProfile.user.name')
                    ->label('Helper')
                    ->url(fn (PlacementRequestResponse $record): ?string => $record->helperProfile
                        ? HelperProfileResource::getUrl('view', ['record' => $record->helperProfile])
                        : null)
                    ->searchable(),
                Tables\Columns\TextColumn::make('status')->badge(),
                Tables\Columns\TextColumn::make('message')
                    ->limit(60)
                    ->searchable(),
                Tables\Columns\TextColumn::make('transferRequest.id')
                    ->label('Transfer')
                    ->url(fn (PlacementRequestResponse $record): ?string => $record->transferRequest
                        ? TransferRequestResource::getUrl('view', ['record' => $record->transferRequest])
                        : null)
                    ->placeholder('None'),
                Tables\Columns\TextColumn::make('responded_at')
                    ->dateTime()
                    ->sortable(),
                Tables\Columns\TextColumn::make('deleted_at')
                    ->dateTime()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options(PlacementResponseStatus::class),
                Tables\Filters\SelectFilter::make('placement_request')
                    ->relationship('placementRequest', 'id')
                    ->searchable(),
                Tables\Filters\SelectFilter::make('helper_profile')
                    ->relationship('helperProfile', 'id')
                    ->searchable(),
                Tables\Filters\TrashedFilter::make(),
            ])
            ->actions([
                ViewAction::make(),
            ])
            ->defaultSort('responded_at', 'desc');
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withoutGlobalScopes([SoftDeletingScope::class]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPlacementRequestResponses::route('/'),
            'view' => Pages\ViewPlacementRequestResponse::route('/{record}'),
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

    public static function canForceDelete(Model $record): bool
    {
        return false;
    }

    public static function canRestore(Model $record): bool
    {
        return false;
    }
}
