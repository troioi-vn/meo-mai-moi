<?php

namespace App\Filament\Resources;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Filament\Exports\PlacementRequestExporter;
use App\Filament\Resources\PlacementRequestResource\Pages;
use App\Filament\Resources\PlacementRequestResource\RelationManagers;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Actions\ExportAction;
use Filament\Tables\Actions\ExportBulkAction;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PlacementRequestResource extends Resource
{
    protected static ?string $model = PlacementRequest::class;

    protected static ?string $navigationIcon = 'heroicon-o-clipboard-document-list';

    protected static ?string $navigationGroup = 'Pet Management';

    protected static ?int $navigationSort = 2;

    protected static ?string $navigationLabel = 'Placement Requests';

    protected static ?string $modelLabel = 'Placement Request';

    protected static ?string $pluralModelLabel = 'Placement Requests';

    protected static ?string $recordTitleAttribute = 'id';

    public static function getGlobalSearchResultTitle(\Illuminate\Database\Eloquent\Model $record): string
    {
        return "Placement Request #{$record->id} - {$record->pet->name}";
    }

    public static function getGlobalSearchResultDetails(\Illuminate\Database\Eloquent\Model $record): array
    {
        return [
            'Owner' => $record->user->name,
            'Type' => match ($record->request_type) {
                PlacementRequestType::FOSTER_PAID => 'Foster (Paid)',
                PlacementRequestType::FOSTER_FREE => 'Foster (Free)',
                PlacementRequestType::PERMANENT => 'Permanent',
                default => $record->request_type->value ?? $record->request_type,
            },
            'Status' => match ($record->status) {
                PlacementRequestStatus::OPEN => 'Open',
                PlacementRequestStatus::FINALIZED => 'Finalized',
                PlacementRequestStatus::FULFILLED => 'Fulfilled',
                PlacementRequestStatus::EXPIRED => 'Expired',
                PlacementRequestStatus::CANCELLED => 'Cancelled',
                default => $record->status->value ?? $record->status,
            },
        ];
    }

    public static function getGloballySearchableAttributes(): array
    {
        return ['pet.name', 'user.name', 'user.email', 'notes'];
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Select::make('pet_id')
                    ->label('Pet')
                    ->relationship('pet', 'name')
                    ->searchable()
                    ->preload()
                    ->required()
                    ->getOptionLabelFromRecordUsing(fn (Pet $record): string => "{$record->name} - {$record->petType->name}"),

                Select::make('user_id')
                    ->label('Owner')
                    ->relationship('user', 'name')
                    ->searchable()
                    ->preload()
                    ->required()
                    ->getOptionLabelFromRecordUsing(fn (User $record): string => "{$record->name} ({$record->email})"),

                Select::make('request_type')
                    ->label('Request Type')
                    ->options([
                        PlacementRequestType::FOSTER_PAID->value => 'Foster (Paid)',
                        PlacementRequestType::FOSTER_FREE->value => 'Foster (Free)',
                        PlacementRequestType::PERMANENT->value => 'Permanent Adoption',
                    ])
                    ->required(),

                Textarea::make('notes')
                    ->label('Description')
                    ->rows(4)
                    ->columnSpanFull(),

                Select::make('status')
                    ->options([
                        PlacementRequestStatus::OPEN->value => 'Open',
                        PlacementRequestStatus::FINALIZED->value => 'Finalized',
                        PlacementRequestStatus::FULFILLED->value => 'Fulfilled',
                        PlacementRequestStatus::EXPIRED->value => 'Expired',
                        PlacementRequestStatus::CANCELLED->value => 'Cancelled',
                    ])
                    ->required()
                    ->default(PlacementRequestStatus::OPEN->value),

                DatePicker::make('start_date')
                    ->label('Start Date'),

                DatePicker::make('end_date')
                    ->label('End Date'),

                DateTimePicker::make('expires_at')
                    ->label('Expires At'),

                // Status is managed through the status field above
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                ImageColumn::make('pet.photo_url')
                    ->label('Photo')
                    ->circular()
                    ->size(50)
                    ->defaultImageUrl(url('/assets/default-avatar.webp')),

                TextColumn::make('pet.name')
                    ->label('Pet')
                    ->searchable(['pets.name'])
                    ->sortable()
                    ->url(fn (PlacementRequest $record): string => route('filament.admin.resources.pets.edit', $record->pet))
                    ->description(fn (PlacementRequest $record): string => $record->pet->petType->name ?? ''),

                TextColumn::make('user.name')
                    ->label('Owner')
                    ->searchable(['users.name', 'users.email'])
                    ->sortable()
                    ->description(fn (PlacementRequest $record): string => $record->user->email ?? ''),

                BadgeColumn::make('request_type')
                    ->label('Type')
                    ->formatStateUsing(fn (PlacementRequestType $state): string => match ($state) {
                        PlacementRequestType::FOSTER_PAID => 'Foster (Paid)',
                        PlacementRequestType::FOSTER_FREE => 'Foster (Free)',
                        PlacementRequestType::PERMANENT => 'Permanent',
                        default => $state->value,
                    })
                    ->colors([
                        'success' => PlacementRequestType::PERMANENT->value,
                        'warning' => PlacementRequestType::FOSTER_PAID->value,
                        'info' => PlacementRequestType::FOSTER_FREE->value,
                    ]),

                BadgeColumn::make('status')
                    ->formatStateUsing(fn (PlacementRequestStatus $state): string => match ($state) {
                        PlacementRequestStatus::OPEN => 'Open',
                        PlacementRequestStatus::FINALIZED => 'Finalized',
                        PlacementRequestStatus::FULFILLED => 'Fulfilled',
                        PlacementRequestStatus::EXPIRED => 'Expired',
                        PlacementRequestStatus::CANCELLED => 'Cancelled',
                        default => $state->value,
                    })
                    ->colors([
                        'success' => PlacementRequestStatus::FULFILLED->value,
                        'warning' => PlacementRequestStatus::FINALIZED->value,
                        'info' => PlacementRequestStatus::OPEN->value,
                        'danger' => [PlacementRequestStatus::EXPIRED->value, PlacementRequestStatus::CANCELLED->value],
                    ]),

                TextColumn::make('notes')
                    ->label('Description')
                    ->limit(50)
                    ->tooltip(function (TextColumn $column): ?string {
                        $state = $column->getState();
                        if (strlen($state) <= 50) {
                            return null;
                        }

                        return $state;
                    })
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('responses_count')
                    ->label('Responses')
                    ->counts('responses')
                    ->sortable(),

                TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->since(),

                TextColumn::make('start_date')
                    ->label('Start Date')
                    ->date()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('end_date')
                    ->label('End Date')
                    ->date()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('expires_at')
                    ->label('Expires')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->color(fn ($state) => $state && $state < now() ? 'danger' : null),

                TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->getStateUsing(fn ($record) => $record->isActive() ? 'Active' : 'Inactive')
                    ->color(fn ($record) => $record->isActive() ? 'success' : 'gray')
                    ->formatStateUsing(fn (bool $state): string => $state ? 'Active' : 'Inactive')
                    ->colors([
                        'success' => true,
                        'danger' => false,
                    ])
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        PlacementRequestStatus::OPEN->value => 'Open',
                        PlacementRequestStatus::FINALIZED->value => 'Finalized',
                        PlacementRequestStatus::FULFILLED->value => 'Fulfilled',
                        PlacementRequestStatus::EXPIRED->value => 'Expired',
                        PlacementRequestStatus::CANCELLED->value => 'Cancelled',
                    ])
                    ->multiple()
                    ->searchable(),

                SelectFilter::make('request_type')
                    ->label('Request Type')
                    ->options([
                        PlacementRequestType::FOSTER_PAID->value => 'Foster (Paid)',
                        PlacementRequestType::FOSTER_FREE->value => 'Foster (Free)',
                        PlacementRequestType::PERMANENT->value => 'Permanent',
                    ])
                    ->multiple()
                    ->searchable(),

                Filter::make('created_at')
                    ->form([
                        DatePicker::make('created_from')
                            ->label('Created From'),
                        DatePicker::make('created_until')
                            ->label('Created Until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['created_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('created_at', '>=', $date),
                            )
                            ->when(
                                $data['created_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('created_at', '<=', $date),
                            );
                    })
                    ->indicateUsing(function (array $data): array {
                        $indicators = [];
                        if ($data['created_from'] ?? null) {
                            $indicators[] = 'Created from '.\Carbon\Carbon::parse($data['created_from'])->toFormattedDateString();
                        }
                        if ($data['created_until'] ?? null) {
                            $indicators[] = 'Created until '.\Carbon\Carbon::parse($data['created_until'])->toFormattedDateString();
                        }

                        return $indicators;
                    }),

                Filter::make('start_date')
                    ->form([
                        DatePicker::make('start_from')
                            ->label('Start Date From'),
                        DatePicker::make('start_until')
                            ->label('Start Date Until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['start_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('start_date', '>=', $date),
                            )
                            ->when(
                                $data['start_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('start_date', '<=', $date),
                            );
                    })
                    ->indicateUsing(function (array $data): array {
                        $indicators = [];
                        if ($data['start_from'] ?? null) {
                            $indicators[] = 'Start from '.\Carbon\Carbon::parse($data['start_from'])->toFormattedDateString();
                        }
                        if ($data['start_until'] ?? null) {
                            $indicators[] = 'Start until '.\Carbon\Carbon::parse($data['start_until'])->toFormattedDateString();
                        }

                        return $indicators;
                    }),

                Filter::make('expires_at')
                    ->form([
                        DatePicker::make('expires_from')
                            ->label('Expires From'),
                        DatePicker::make('expires_until')
                            ->label('Expires Until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['expires_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('expires_at', '>=', $date),
                            )
                            ->when(
                                $data['expires_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('expires_at', '<=', $date),
                            );
                    })
                    ->indicateUsing(function (array $data): array {
                        $indicators = [];
                        if ($data['expires_from'] ?? null) {
                            $indicators[] = 'Expires from '.\Carbon\Carbon::parse($data['expires_from'])->toFormattedDateString();
                        }
                        if ($data['expires_until'] ?? null) {
                            $indicators[] = 'Expires until '.\Carbon\Carbon::parse($data['expires_until'])->toFormattedDateString();
                        }

                        return $indicators;
                    }),

                Filter::make('active_only')
                    ->label('Active Only')
                    ->query(fn (Builder $query): Builder => $query->where('status', \App\Enums\PlacementRequestStatus::OPEN))
                    ->default(),

                Filter::make('has_responses')
                    ->label('Has Responses')
                    ->query(fn (Builder $query): Builder => $query->has('responses')),

                Filter::make('no_responses')
                    ->label('No Responses')
                    ->query(fn (Builder $query): Builder => $query->doesntHave('responses')),

                Filter::make('expiring_soon')
                    ->label('Expiring Soon (7 days)')
                    ->query(fn (Builder $query): Builder => $query->where('expires_at', '<=', now()->addDays(7))->where('expires_at', '>=', now())),

                SelectFilter::make('pet')
                    ->label('Pet')
                    ->relationship('pet', 'name')
                    ->searchable()
                    ->preload()
                    ->multiple(),

                SelectFilter::make('user')
                    ->label('Owner')
                    ->relationship('user', 'name')
                    ->searchable()
                    ->preload()
                    ->multiple()
                    ->getOptionLabelFromRecordUsing(fn ($record) => "{$record->name} ({$record->email})"),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                    ExportBulkAction::make()
                        ->exporter(PlacementRequestExporter::class),
                ]),
            ])
            ->headerActions([
                ExportAction::make()
                    ->exporter(PlacementRequestExporter::class),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\ResponsesRelationManager::class,
            RelationManagers\TransferRequestsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPlacementRequests::route('/'),
            'create' => Pages\CreatePlacementRequest::route('/create'),
            'view' => Pages\ViewPlacementRequest::route('/{record}'),
            'edit' => Pages\EditPlacementRequest::route('/{record}/edit'),
        ];
    }
}
