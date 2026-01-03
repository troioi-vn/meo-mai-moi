<?php

namespace App\Filament\Resources;

use App\Enums\PetSex;
use App\Enums\PetStatus;
use App\Filament\Resources\PetResource\Pages;
use App\Filament\Resources\PetResource\RelationManagers;
use App\Models\Pet;
use App\Models\PetType;
use Filament\Forms;
use Filament\Forms\Components\Select;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables\Actions\BulkActionGroup;
use Filament\Tables\Actions\DeleteBulkAction;
use Filament\Tables\Actions\EditAction;
use Filament\Tables\Actions\ViewAction;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

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
                Forms\Components\TextInput::make('name')
                    ->required()
                    ->maxLength(255),

                Select::make('pet_type_id')
                    ->label('Pet Type')
                    ->options(PetType::active()->pluck('name', 'id'))
                    ->default(1) // Default to Cat
                    ->required()
                    ->searchable()
                    ->preload(),

                Select::make('sex')
                    ->options(PetSex::class)
                    ->default('not_specified')
                    ->required(),

                Forms\Components\DatePicker::make('birthday')
                    ->required()
                    ->maxDate(now()),

                Forms\Components\TextInput::make('location')
                    ->required()
                    ->maxLength(255),

                Forms\Components\Textarea::make('description')
                    ->maxLength(65535)
                    ->rows(4)
                    ->columnSpanFull(),

                Select::make('status')
                    ->options(PetStatus::class)
                    ->required()
                    ->default('active'),

                Select::make('user_id')
                    ->label('Owner')
                    ->relationship('user', 'name')
                    ->searchable()
                    ->preload()
                    ->required(),

                Select::make('viewers')
                    ->label('Viewers (can view)')
                    ->relationship('viewers', 'name')
                    ->multiple()
                    ->searchable()
                    ->preload(),

                Select::make('editors')
                    ->label('Editors (can edit)')
                    ->relationship('editors', 'name')
                    ->multiple()
                    ->searchable()
                    ->preload(),
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

                BadgeColumn::make('petType.name')
                    ->label('Type')
                    ->colors([
                        'primary' => 'Cat',
                        'success' => 'Dog',
                        'gray' => fn ($state) => ! in_array($state, ['Cat', 'Dog']),
                    ]),

                BadgeColumn::make('sex')
                    ->colors([
                        'primary' => 'male',
                        'danger' => 'female',
                        'gray' => 'not_specified',
                    ])
                    ->formatStateUsing(fn ($state) => match ($state) {
                        'male' => 'Male',
                        'female' => 'Female',
                        default => 'Not Specified',
                    }),

                TextColumn::make('birthday')
                    ->date()
                    ->sortable()
                    ->formatStateUsing(function ($state) {
                        if (! $state) {
                            return '-';
                        }
                        $age = now()->diffInYears($state);

                        return $state->format('M j, Y')." ({$age}y)";
                    }),

                TextColumn::make('location')
                    ->searchable()
                    ->limit(30),

                BadgeColumn::make('status')
                    ->colors([
                        'success' => 'active',
                        'warning' => 'lost',
                        'primary' => 'deceased',
                        'danger' => 'deleted',
                    ]),

                TextColumn::make('user.name')
                    ->label('Owner')
                    ->searchable()
                    ->sortable(),

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
                    ->options(PetType::active()->pluck('name', 'id'))
                    ->searchable()
                    ->preload(),

                SelectFilter::make('status')
                    ->options(PetStatus::class)
                    ->searchable(),

                SelectFilter::make('user_id')
                    ->label('Owner')
                    ->relationship('user', 'name')
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
        return static::getModel()::count();
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->with(['petType', 'creator']);
    }
}
