<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PlacementRequestResource\Pages;
use App\Filament\Resources\PlacementRequestResource\RelationManagers;
use App\Models\PlacementRequest;
use App\Models\Cat;
use App\Models\User;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\DateFilter;
use Filament\Forms\Components\DateTimePicker;
use Filament\Tables\Actions\ExportAction;
use Filament\Tables\Actions\ExportBulkAction;
use App\Filament\Exports\PlacementRequestExporter;

class PlacementRequestResource extends Resource
{
    protected static ?string $model = PlacementRequest::class;

    protected static ?string $navigationIcon = 'heroicon-o-clipboard-document-list';

    protected static ?string $navigationGroup = 'Placements';

    protected static ?int $navigationSort = 1;

    protected static ?string $navigationLabel = 'Placement Requests';

    protected static ?string $modelLabel = 'Placement Request';

    protected static ?string $pluralModelLabel = 'Placement Requests';

    protected static ?string $recordTitleAttribute = 'id';

    public static function getGlobalSearchResultTitle(\Illuminate\Database\Eloquent\Model $record): string
    {
        return "Placement Request #{$record->id} - {$record->cat->name}";
    }

    public static function getGlobalSearchResultDetails(\Illuminate\Database\Eloquent\Model $record): array
    {
        return [
            'Owner' => $record->user->name,
            'Type' => match ($record->request_type) {
                'foster_payed' => 'Foster (Paid)',
                'foster_free' => 'Foster (Free)',
                'permanent' => 'Permanent',
                default => $record->request_type,
            },
            'Status' => match ($record->status) {
                'open' => 'Open',
                'pending_review' => 'Pending Review',
                'fulfilled' => 'Fulfilled',
                'expired' => 'Expired',
                'cancelled' => 'Cancelled',
                default => $record->status,
            },
        ];
    }

    public static function getGloballySearchableAttributes(): array
    {
        return ['cat.name', 'user.name', 'user.email', 'notes'];
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Select::make('cat_id')
                    ->label('Cat')
                    ->relationship('cat', 'name')
                    ->searchable()
                    ->preload()
                    ->required()
                    ->getOptionLabelFromRecordUsing(fn (Cat $record): string => "{$record->name} ({$record->breed})"),

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
                        PlacementRequestType::FOSTER_PAYED->value => 'Foster (Paid)',
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
                        PlacementRequestStatus::PENDING_REVIEW->value => 'Pending Review',
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

                Toggle::make('is_active')
                    ->label('Active')
                    ->default(true),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                ImageColumn::make('cat.photo_url')
                    ->label('Photo')
                    ->circular()
                    ->size(50)
                    ->defaultImageUrl(url('/assets/default-avatar.webp')),

                TextColumn::make('cat.name')
                    ->label('Cat')
                    ->searchable(['cats.name', 'cats.breed'])
                    ->sortable()
                    ->url(fn (PlacementRequest $record): string => route('filament.admin.resources.cats.edit', $record->cat))
                    ->description(fn (PlacementRequest $record): string => $record->cat->breed ?? ''),

                TextColumn::make('user.name')
                    ->label('Owner')
                    ->searchable(['users.name', 'users.email'])
                    ->sortable()
                    ->description(fn (PlacementRequest $record): string => $record->user->email ?? ''),

                BadgeColumn::make('request_type')
                    ->label('Type')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'foster_payed' => 'Foster (Paid)',
                        'foster_free' => 'Foster (Free)',
                        'permanent' => 'Permanent',
                        default => $state,
                    })
                    ->colors([
                        'success' => 'permanent',
                        'warning' => 'foster_payed',
                        'info' => 'foster_free',
                    ]),

                BadgeColumn::make('status')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'open' => 'Open',
                        'pending_review' => 'Pending Review',
                        'fulfilled' => 'Fulfilled',
                        'expired' => 'Expired',
                        'cancelled' => 'Cancelled',
                        default => $state,
                    })
                    ->colors([
                        'success' => 'fulfilled',
                        'warning' => 'pending_review',
                        'info' => 'open',
                        'danger' => ['expired', 'cancelled'],
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

                TextColumn::make('transfer_requests_count')
                    ->label('Responses')
                    ->counts('transferRequests')
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

                TextColumn::make('is_active')
                    ->label('Active')
                    ->badge()
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
                        'open' => 'Open',
                        'pending_review' => 'Pending Review',
                        'fulfilled' => 'Fulfilled',
                        'expired' => 'Expired',
                        'cancelled' => 'Cancelled',
                    ])
                    ->multiple()
                    ->searchable(),

                SelectFilter::make('request_type')
                    ->label('Request Type')
                    ->options([
                        'foster_payed' => 'Foster (Paid)',
                        'foster_free' => 'Foster (Free)',
                        'permanent' => 'Permanent',
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
                            $indicators[] = 'Created from ' . \Carbon\Carbon::parse($data['created_from'])->toFormattedDateString();
                        }
                        if ($data['created_until'] ?? null) {
                            $indicators[] = 'Created until ' . \Carbon\Carbon::parse($data['created_until'])->toFormattedDateString();
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
                            $indicators[] = 'Start from ' . \Carbon\Carbon::parse($data['start_from'])->toFormattedDateString();
                        }
                        if ($data['start_until'] ?? null) {
                            $indicators[] = 'Start until ' . \Carbon\Carbon::parse($data['start_until'])->toFormattedDateString();
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
                            $indicators[] = 'Expires from ' . \Carbon\Carbon::parse($data['expires_from'])->toFormattedDateString();
                        }
                        if ($data['expires_until'] ?? null) {
                            $indicators[] = 'Expires until ' . \Carbon\Carbon::parse($data['expires_until'])->toFormattedDateString();
                        }
                        return $indicators;
                    }),

                Filter::make('active_only')
                    ->label('Active Only')
                    ->query(fn (Builder $query): Builder => $query->where('is_active', true))
                    ->default(),

                Filter::make('has_responses')
                    ->label('Has Responses')
                    ->query(fn (Builder $query): Builder => $query->has('transferRequests')),

                Filter::make('no_responses')
                    ->label('No Responses')
                    ->query(fn (Builder $query): Builder => $query->doesntHave('transferRequests')),

                Filter::make('expiring_soon')
                    ->label('Expiring Soon (7 days)')
                    ->query(fn (Builder $query): Builder => $query->where('expires_at', '<=', now()->addDays(7))->where('expires_at', '>=', now())),

                SelectFilter::make('cat')
                    ->label('Cat')
                    ->relationship('cat', 'name')
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