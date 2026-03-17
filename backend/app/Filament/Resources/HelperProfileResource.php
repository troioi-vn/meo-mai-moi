<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Enums\HelperProfileApprovalStatus;
use App\Enums\HelperProfileStatus;
use App\Enums\PlacementRequestType;
use App\Filament\Resources\HelperProfileResource\Pages;
use App\Filament\Resources\HelperProfileResource\RelationManagers;
use App\Models\HelperProfile;
use App\Models\PetType;
use Filament\Actions;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class HelperProfileResource extends Resource
{
    protected static ?string $model = HelperProfile::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-user-group';

    protected static string|\UnitEnum|null $navigationGroup = 'Management';

    protected static ?int $navigationSort = 1;

    protected static ?string $navigationLabel = 'Helper Profiles';

    protected static bool $shouldRegisterNavigation = true;

    protected static ?string $pluralModelLabel = 'Helper Profiles';

    public static function form(Schema $form): Schema
    {
        return $form
            ->schema([
                Forms\Components\Select::make('user_id')
                    ->label('User')
                    ->relationship('user', 'name')
                    ->searchable()
                    ->preload()
                    ->required()
                    ->columnSpanFull(),

                Section::make('Services Offered')
                    ->schema([
                        Forms\Components\CheckboxList::make('request_types')
                            ->label('Request Types')
                            ->options(PlacementRequestType::class)
                            ->required()
                            ->minItems(1)
                            ->columnSpanFull(),
                    ]),

                Section::make('Location Information')
                    ->schema([
                        Forms\Components\TextInput::make('country')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\TextInput::make('address')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\TextInput::make('city')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\TextInput::make('state')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\TextInput::make('zip_code')
                            ->maxLength(20),
                        Forms\Components\TextInput::make('phone_number')
                            ->tel()
                            ->required()
                            ->maxLength(255),
                    ])
                    ->columns(2),

                Section::make('Profile Details')
                    ->schema([
                        Forms\Components\Textarea::make('experience')
                            ->label('Experience with Animals')
                            ->required()
                            ->rows(4)
                            ->columnSpanFull(),
                        Forms\Components\Checkbox::make('has_pets')
                            ->label('Has Pets'),
                        Forms\Components\Checkbox::make('has_children')
                            ->label('Has Children'),
                        Forms\Components\CheckboxList::make('pet_type_ids')
                            ->label('Pet Types for Placement Requests')
                            ->relationship('petTypes', 'name')
                            ->options(function () {
                                return PetType::where('placement_requests_allowed', true)
                                    ->pluck('name', 'id');
                            })
                            ->required()
                            ->minItems(1)
                            ->columnSpanFull(),
                    ])
                    ->columns(2),

                Section::make('Status')
                    ->schema([
                        Forms\Components\Select::make('approval_status')
                            ->label('Approval Status')
                            ->options(HelperProfileApprovalStatus::class)
                            ->default(HelperProfileApprovalStatus::PENDING)
                            ->required(),

                        Forms\Components\Hidden::make('status')
                            ->default(HelperProfileStatus::PRIVATE->value),

                        Forms\Components\Toggle::make('is_public')
                            ->label('Public profile')
                            ->helperText('Public helper profiles are visible on the public /helpers pages.')
                            ->default(false)
                            ->live()
                            ->dehydrated(false)
                            ->afterStateHydrated(function ($component, ?HelperProfile $record): void {
                                $component->state($record?->status === HelperProfileStatus::PUBLIC);
                            })
                            ->afterStateUpdated(function ($state, $set): void {
                                $set('status', $state ? HelperProfileStatus::PUBLIC->value : HelperProfileStatus::PRIVATE->value);
                            })
                            ->disabled(fn (?HelperProfile $record): bool => in_array($record?->status, [
                                HelperProfileStatus::ARCHIVED,
                                HelperProfileStatus::DELETED,
                            ], true)),

                        Forms\Components\Placeholder::make('lifecycle_status')
                            ->label('Lifecycle Status')
                            ->content(fn (?HelperProfile $record): string => $record?->status?->getLabel() ?? 'Private')
                            ->visible(fn (?HelperProfile $record): bool => in_array($record?->status, [
                                HelperProfileStatus::ARCHIVED,
                                HelperProfileStatus::DELETED,
                            ], true)),

                        Forms\Components\DateTimePicker::make('archived_at')
                            ->label('Archived At')
                            ->disabled()
                            ->dehydrated(false)
                            ->visible(fn ($record) => $record && $record->archived_at),

                        Forms\Components\DateTimePicker::make('restored_at')
                            ->label('Restored At')
                            ->disabled()
                            ->dehydrated(false)
                            ->visible(fn ($record) => $record && $record->restored_at),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('user.name')
                    ->label('User Name')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('user.email')
                    ->label('Email')
                    ->searchable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('request_types')
                    ->label('Request Types')
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => PlacementRequestType::tryFrom($state)?->getLabel() ?? $state)
                    ->color(fn (string $state): string => PlacementRequestType::tryFrom($state)?->getColor() ?? 'gray')
                    ->separator(','),

                Tables\Columns\TextColumn::make('country')
                    ->label('Country')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('city')
                    ->label('City')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('approval_status')
                    ->label('Approval')
                    ->badge(),

                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge(),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('updated_at')
                    ->label('Updated')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('approval_status')
                    ->label('Approval Status')
                    ->options(HelperProfileApprovalStatus::class),

                Tables\Filters\SelectFilter::make('status')
                    ->label('Profile Status')
                    ->options(HelperProfileStatus::class),

                Tables\Filters\SelectFilter::make('request_types')
                    ->label('Request Types')
                    ->multiple()
                    ->options(PlacementRequestType::class)
                    ->query(function (Builder $query, array $data): Builder {
                        if (empty($data['values'])) {
                            return $query;
                        }

                        return $query->where(function (Builder $q) use ($data): void {
                            foreach ($data['values'] as $type) {
                                $q->orWhereJsonContains('request_types', $type);
                            }
                        });
                    }),

                Tables\Filters\SelectFilter::make('country')
                    ->searchable()
                    ->preload(),

            ])
            ->actions([
                Actions\ViewAction::make(),
                Actions\EditAction::make(),
                Actions\DeleteAction::make(),

                Actions\Action::make('approve')
                    ->label('Approve')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->visible(fn (HelperProfile $record): bool => $record->approval_status === HelperProfileApprovalStatus::PENDING)
                    ->requiresConfirmation()
                    ->modalHeading('Approve Helper Profile')
                    ->modalDescription('Are you sure you want to approve this helper profile?')
                    ->action(function (HelperProfile $record): void {
                        $record->update(['approval_status' => HelperProfileApprovalStatus::APPROVED]);

                        Notification::make()
                            ->title('Helper profile approved successfully')
                            ->success()
                            ->send();
                    }),

                Actions\Action::make('reject')
                    ->label('Reject')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->visible(fn (HelperProfile $record): bool => $record->approval_status === HelperProfileApprovalStatus::PENDING)
                    ->requiresConfirmation()
                    ->modalHeading('Reject Helper Profile')
                    ->modalDescription('Are you sure you want to reject this helper profile?')
                    ->action(function (HelperProfile $record): void {
                        $record->update(['approval_status' => HelperProfileApprovalStatus::REJECTED]);

                        Notification::make()
                            ->title('Helper profile rejected successfully')
                            ->success()
                            ->send();
                    }),

                Actions\Action::make('suspend')
                    ->label('Suspend')
                    ->icon('heroicon-o-pause-circle')
                    ->color('warning')
                    ->visible(fn (HelperProfile $record): bool => $record->approval_status === HelperProfileApprovalStatus::APPROVED)
                    ->requiresConfirmation()
                    ->modalHeading('Suspend Helper Profile')
                    ->modalDescription('Are you sure you want to suspend this helper profile?')
                    ->action(function (HelperProfile $record): void {
                        $record->update(['approval_status' => HelperProfileApprovalStatus::SUSPENDED]);

                        Notification::make()
                            ->title('Helper profile suspended successfully')
                            ->success()
                            ->send();
                    }),

                Actions\Action::make('reactivate')
                    ->label('Reactivate')
                    ->icon('heroicon-o-play-circle')
                    ->color('success')
                    ->visible(fn (HelperProfile $record): bool => $record->approval_status === HelperProfileApprovalStatus::SUSPENDED)
                    ->requiresConfirmation()
                    ->modalHeading('Reactivate Helper Profile')
                    ->modalDescription('Are you sure you want to reactivate this helper profile?')
                    ->action(function (HelperProfile $record): void {
                        $record->update(['approval_status' => HelperProfileApprovalStatus::APPROVED]);

                        Notification::make()
                            ->title('Helper profile reactivated successfully')
                            ->success()
                            ->send();
                    }),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make(),

                    Actions\BulkAction::make('approve')
                        ->label('Approve Selected')
                        ->icon('heroicon-o-check-circle')
                        ->color('success')
                        ->requiresConfirmation()
                        ->modalHeading('Approve Helper Profiles')
                        ->modalDescription('Are you sure you want to approve the selected helper profiles?')
                        ->action(function (Collection $records): void {
                            /** @var Collection<int, HelperProfile> $records */
                            $count = $records->where('approval_status', HelperProfileApprovalStatus::PENDING)->count();

                            $records->where('approval_status', HelperProfileApprovalStatus::PENDING)
                                ->each(fn (HelperProfile $record) => $record->update(['approval_status' => HelperProfileApprovalStatus::APPROVED]));

                            Notification::make()
                                ->title("{$count} helper profiles approved successfully")
                                ->success()
                                ->send();
                        }),

                    Actions\BulkAction::make('reject')
                        ->label('Reject Selected')
                        ->icon('heroicon-o-x-circle')
                        ->color('danger')
                        ->requiresConfirmation()
                        ->modalHeading('Reject Helper Profiles')
                        ->modalDescription('Are you sure you want to reject the selected helper profiles?')
                        ->action(function (Collection $records): void {
                            /** @var Collection<int, HelperProfile> $records */
                            $count = $records->where('approval_status', HelperProfileApprovalStatus::PENDING)->count();

                            $records->where('approval_status', HelperProfileApprovalStatus::PENDING)
                                ->each(fn (HelperProfile $record) => $record->update(['approval_status' => HelperProfileApprovalStatus::REJECTED]));

                            Notification::make()
                                ->title("{$count} helper profiles rejected successfully")
                                ->success()
                                ->send();
                        }),

                    Actions\BulkAction::make('suspend')
                        ->label('Suspend Selected')
                        ->icon('heroicon-o-pause-circle')
                        ->color('warning')
                        ->requiresConfirmation()
                        ->modalHeading('Suspend Helper Profiles')
                        ->modalDescription('Are you sure you want to suspend the selected helper profiles?')
                        ->action(function (Collection $records): void {
                            /** @var Collection<int, HelperProfile> $records */
                            $count = $records->where('approval_status', HelperProfileApprovalStatus::APPROVED)->count();

                            $records->where('approval_status', HelperProfileApprovalStatus::APPROVED)
                                ->each(fn (HelperProfile $record) => $record->update(['approval_status' => HelperProfileApprovalStatus::SUSPENDED]));

                            Notification::make()
                                ->title("{$count} helper profiles suspended successfully")
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
            RelationManagers\PhotosRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListHelperProfiles::route('/'),
            'create' => Pages\CreateHelperProfile::route('/create'),
            'view' => Pages\ViewHelperProfile::route('/{record}'),
            'edit' => Pages\EditHelperProfile::route('/{record}/edit'),
        ];
    }
}
