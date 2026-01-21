<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Enums\PetSex;
use App\Enums\PetStatus;
use App\Filament\Resources\PetResource\Pages;
use App\Filament\Resources\PetResource\RelationManagers;
use App\Models\Pet;
use Filament\Forms;
use Filament\Forms\Components\Select;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables\Actions\BulkActionGroup;
use Filament\Tables\Actions\DeleteBulkAction;
use Filament\Tables\Actions\EditAction;
use Filament\Tables\Actions\ViewAction;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

/**
 * Filament Resource for managing Pets.
 *
 * Provides comprehensive admin interface for creating, viewing, editing, and deleting
 * pet records. Includes relationships for handling pet owners, medical records, placement
 * requests, and relationships with users.
 *
 * @see Pet
 */
class PetResource extends Resource
{
    protected static ?string $model = Pet::class;

    protected static ?string $navigationIcon = 'heroicon-o-heart';

    protected static ?string $navigationGroup = 'Pet Management';

    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Tabs::make('Pet Details')
                    ->tabs([
                        Forms\Components\Tabs\Tab::make('Basic Info')
                            ->icon('heroicon-o-information-circle')
                            ->schema([
                                Forms\Components\Section::make('Core Details')
                                    ->schema([
                                        Forms\Components\TextInput::make('name')
                                            ->required()
                                            ->maxLength(255),

                                        Select::make('pet_type_id')
                                            ->label('Pet Type')
                                            ->relationship('petType', 'name')
                                            ->default(1)
                                            ->required()
                                            ->searchable()
                                            ->preload(),

                                        Select::make('sex')
                                            ->options(PetSex::class)
                                            ->default(PetSex::NOT_SPECIFIED)
                                            ->required(),
                                    ])->columns(2),

                                Forms\Components\Section::make('Management')
                                    ->schema([
                                        Select::make('status')
                                            ->options(PetStatus::class)
                                            ->required()
                                            ->default(PetStatus::ACTIVE),

                                        Select::make('created_by')
                                            ->label('Creator')
                                            ->relationship('creator', 'name')
                                            ->searchable()
                                            ->preload()
                                            ->required(),
                                    ])->columns(2),
                            ]),

                        Forms\Components\Tabs\Tab::make('Birthday')
                            ->icon('heroicon-o-cake')
                            ->schema([
                                Forms\Components\Section::make('Date Selection')
                                    ->schema([
                                        Forms\Components\DatePicker::make('birthday')
                                            ->maxDate(now()),

                                        Select::make('birthday_precision')
                                            ->options([
                                                'day' => 'Exact Date',
                                                'month' => 'Month and Year',
                                                'year' => 'Year Only',
                                                'unknown' => 'Unknown',
                                            ])
                                            ->default('day'),
                                    ])->columns(2),

                                Forms\Components\Section::make('Manual Components')
                                    ->description('Used when precise birthday is unknown.')
                                    ->schema([
                                        Forms\Components\TextInput::make('birthday_year')
                                            ->numeric()
                                            ->minValue(1900)
                                            ->maxValue(now()->year),

                                        Forms\Components\TextInput::make('birthday_month')
                                            ->numeric()
                                            ->minValue(1)
                                            ->maxValue(12),

                                        Forms\Components\TextInput::make('birthday_day')
                                            ->numeric()
                                            ->minValue(1)
                                            ->maxValue(31),
                                    ])->columns(3),
                            ]),

                        Forms\Components\Tabs\Tab::make('Location')
                            ->icon('heroicon-o-map-pin')
                            ->schema([
                                Forms\Components\Section::make('Regional Details')
                                    ->schema([
                                        Forms\Components\TextInput::make('country')
                                            ->maxLength(2),

                                        Forms\Components\TextInput::make('state')
                                            ->maxLength(255),
                                    ])->columns(2),

                                Forms\Components\Section::make('City')
                                    ->schema([
                                        Select::make('city_id')
                                            ->label('City (Reference)')
                                            ->relationship('city', 'name')
                                            ->searchable()
                                            ->preload(),

                                        Forms\Components\TextInput::make('city')
                                            ->label('City (Custom)')
                                            ->maxLength(255),
                                    ])->columns(2),

                                Forms\Components\TextInput::make('address')
                                    ->maxLength(255)
                                    ->columnSpanFull(),
                            ]),

                        Forms\Components\Tabs\Tab::make('Description')
                            ->icon('heroicon-o-document-text')
                            ->schema([
                                Forms\Components\Textarea::make('description')
                                    ->maxLength(65535)
                                    ->rows(10)
                                    ->columnSpanFull(),
                            ]),
                    ])->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                ImageColumn::make('photo_url')
                    ->label('Photo')
                    ->circular()
                    ->size(40)
                    ->toggleable(),
                TextColumn::make('name')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('petType.name')
                    ->label('Type')
                    ->badge()
                    ->color(fn ($state) => match ($state) {
                        'Cat' => 'primary',
                        'Dog' => 'success',
                        default => 'gray',
                    }),

                TextColumn::make('sex')
                    ->badge(),

                TextColumn::make('birthday')
                    ->date()
                    ->sortable()
                    ->description(function ($record) {
                        if (! $record->birthday) {
                            return null;
                        }
                        $age = $record->birthday->age;

                        return "{$age} years old";
                    }),

                TextColumn::make('city')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('state')
                    ->searchable()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('status')
                    ->badge(),

                TextColumn::make('owners.name')
                    ->label('Owners')
                    ->badge()
                    ->searchable(),

                TextColumn::make('creator.name')
                    ->label('Creator')
                    ->searchable()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('pet_type_id')
                    ->label('Pet Type')
                    ->relationship('petType', 'name')
                    ->searchable()
                    ->preload(),

                SelectFilter::make('status')
                    ->options(PetStatus::class)
                    ->searchable(),

                SelectFilter::make('created_by')
                    ->label('Creator')
                    ->relationship('creator', 'name')
                    ->searchable()
                    ->preload(),
            ])
            ->actions([
                ViewAction::make(),
                EditAction::make(),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\RelationshipsRelationManager::class,
            RelationManagers\WeightHistoriesRelationManager::class,
            // TODO: FosterAssignmentsRelationManager removed - reimplment when rehoming flow is rebuilt
            RelationManagers\PlacementRequestsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPets::route('/'),
            'create' => Pages\CreatePet::route('/create'),
            'view' => Pages\ViewPet::route('/{record}'),
            'edit' => Pages\EditPet::route('/{record}/edit'),
            'photos' => Pages\ManagePhotos::route('/{record}/photos'),
        ];
    }

    public static function getNavigationBadge(): ?string
    {
        $count = static::getModel()::count();

        return $count > 0 ? (string) $count : null;
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->with(['petType', 'creator', 'owners', 'fosters', 'sitters']);
    }
}
