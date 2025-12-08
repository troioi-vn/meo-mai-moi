<?php

namespace App\Filament\Resources;

use App\Enums\PlacementRequestType;
use App\Filament\Resources\HelperProfileResource\Pages;
use App\Filament\Resources\HelperProfileResource\RelationManagers;
use App\Models\HelperProfile;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class HelperProfileResource extends Resource
{
    protected static ?string $model = HelperProfile::class;

    protected static ?string $navigationIcon = 'heroicon-o-user-group';

    protected static ?string $navigationGroup = 'Users & Helpers';

    protected static ?int $navigationSort = 2;

    protected static ?string $navigationLabel = 'Helper Profiles';

    protected static ?string $pluralModelLabel = 'Helper Profiles';

    public static function form(Form $form): Form
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

                Forms\Components\Section::make('Services Offered')
                    ->schema([
                        Forms\Components\CheckboxList::make('request_types')
                            ->label('Request Types')
                            ->options([
                                PlacementRequestType::FOSTER_PAYED->value => 'Foster (Paid)',
                                PlacementRequestType::FOSTER_FREE->value => 'Foster (Free)',
                                PlacementRequestType::PERMANENT->value => 'Permanent Adoption',
                            ])
                            ->required()
                            ->minItems(1)
                            ->columnSpanFull(),
                    ]),

                Forms\Components\Section::make('Location Information')
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

                Forms\Components\Section::make('Profile Details')
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
                                return \App\Models\PetType::where('placement_requests_allowed', true)
                                    ->pluck('name', 'id');
                            })
                            ->columnSpanFull(),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Status')
                    ->schema([
                        Forms\Components\Select::make('approval_status')
                            ->label('Approval Status')
                            ->options([
                                'pending' => 'Pending',
                                'approved' => 'Approved',
                                'rejected' => 'Rejected',
                                'suspended' => 'Suspended',
                            ])
                            ->default('pending')
                            ->required(),
                    ]),
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
                    ->formatStateUsing(function (HelperProfile $record): string {
                        $types = $record->request_types ?? [];
                        $labels = array_map(function ($type) {
                            return match ($type) {
                                'foster_payed' => 'Foster (Paid)',
                                'foster_free' => 'Foster (Free)',
                                'permanent' => 'Permanent',
                                default => $type,
                            };
                        }, $types);

                        return implode(', ', $labels) ?: 'None';
                    })
                    ->badge()
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
                    ->label('Status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'approved' => 'success',
                        'pending' => 'warning',
                        'rejected' => 'danger',
                        'suspended' => 'gray',
                        default => 'gray',
                    }),

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
                    ->label('Status')
                    ->options([
                        'pending' => 'Pending',
                        'approved' => 'Approved',
                        'rejected' => 'Rejected',
                        'suspended' => 'Suspended',
                    ]),

                Tables\Filters\SelectFilter::make('request_types')
                    ->label('Request Types')
                    ->multiple()
                    ->options([
                        PlacementRequestType::FOSTER_PAYED->value => 'Foster (Paid)',
                        PlacementRequestType::FOSTER_FREE->value => 'Foster (Free)',
                        PlacementRequestType::PERMANENT->value => 'Permanent',
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        if (empty($data['values'])) {
                            return $query;
                        }

                        return $query->where(function (Builder $q) use ($data) {
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
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),

                Tables\Actions\Action::make('approve')
                    ->label('Approve')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->visible(fn (HelperProfile $record): bool => $record->approval_status === 'pending')
                    ->requiresConfirmation()
                    ->modalHeading('Approve Helper Profile')
                    ->modalDescription('Are you sure you want to approve this helper profile?')
                    ->action(function (HelperProfile $record): void {
                        $record->update(['approval_status' => 'approved']);

                        Notification::make()
                            ->title('Helper profile approved successfully')
                            ->success()
                            ->send();
                    }),

                Tables\Actions\Action::make('reject')
                    ->label('Reject')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->visible(fn (HelperProfile $record): bool => $record->approval_status === 'pending')
                    ->requiresConfirmation()
                    ->modalHeading('Reject Helper Profile')
                    ->modalDescription('Are you sure you want to reject this helper profile?')
                    ->action(function (HelperProfile $record): void {
                        $record->update(['approval_status' => 'rejected']);

                        Notification::make()
                            ->title('Helper profile rejected successfully')
                            ->success()
                            ->send();
                    }),

                Tables\Actions\Action::make('suspend')
                    ->label('Suspend')
                    ->icon('heroicon-o-pause-circle')
                    ->color('warning')
                    ->visible(fn (HelperProfile $record): bool => $record->approval_status === 'approved')
                    ->requiresConfirmation()
                    ->modalHeading('Suspend Helper Profile')
                    ->modalDescription('Are you sure you want to suspend this helper profile?')
                    ->action(function (HelperProfile $record): void {
                        $record->update(['approval_status' => 'suspended']);

                        Notification::make()
                            ->title('Helper profile suspended successfully')
                            ->success()
                            ->send();
                    }),

                Tables\Actions\Action::make('reactivate')
                    ->label('Reactivate')
                    ->icon('heroicon-o-play-circle')
                    ->color('success')
                    ->visible(fn (HelperProfile $record): bool => $record->approval_status === 'suspended')
                    ->requiresConfirmation()
                    ->modalHeading('Reactivate Helper Profile')
                    ->modalDescription('Are you sure you want to reactivate this helper profile?')
                    ->action(function (HelperProfile $record): void {
                        $record->update(['approval_status' => 'approved']);

                        Notification::make()
                            ->title('Helper profile reactivated successfully')
                            ->success()
                            ->send();
                    }),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),

                    Tables\Actions\BulkAction::make('approve')
                        ->label('Approve Selected')
                        ->icon('heroicon-o-check-circle')
                        ->color('success')
                        ->requiresConfirmation()
                        ->modalHeading('Approve Helper Profiles')
                        ->modalDescription('Are you sure you want to approve the selected helper profiles?')
                        ->action(function (Collection $records): void {
                            /** @var Collection<int, HelperProfile> $records */
                            $count = $records->where('approval_status', 'pending')->count();

                            $records->where('approval_status', 'pending')
                                ->each(fn (HelperProfile $record) => $record->update(['approval_status' => 'approved']));

                            Notification::make()
                                ->title("{$count} helper profiles approved successfully")
                                ->success()
                                ->send();
                        }),

                    Tables\Actions\BulkAction::make('reject')
                        ->label('Reject Selected')
                        ->icon('heroicon-o-x-circle')
                        ->color('danger')
                        ->requiresConfirmation()
                        ->modalHeading('Reject Helper Profiles')
                        ->modalDescription('Are you sure you want to reject the selected helper profiles?')
                        ->action(function (Collection $records): void {
                            /** @var Collection<int, HelperProfile> $records */
                            $count = $records->where('approval_status', 'pending')->count();

                            $records->where('approval_status', 'pending')
                                ->each(fn (HelperProfile $record) => $record->update(['approval_status' => 'rejected']));

                            Notification::make()
                                ->title("{$count} helper profiles rejected successfully")
                                ->success()
                                ->send();
                        }),

                    Tables\Actions\BulkAction::make('suspend')
                        ->label('Suspend Selected')
                        ->icon('heroicon-o-pause-circle')
                        ->color('warning')
                        ->requiresConfirmation()
                        ->modalHeading('Suspend Helper Profiles')
                        ->modalDescription('Are you sure you want to suspend the selected helper profiles?')
                        ->action(function (Collection $records): void {
                            /** @var Collection<int, HelperProfile> $records */
                            $count = $records->where('approval_status', 'approved')->count();

                            $records->where('approval_status', 'approved')
                                ->each(fn (HelperProfile $record) => $record->update(['approval_status' => 'suspended']));

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
