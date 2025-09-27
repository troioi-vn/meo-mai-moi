<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PetTypeResource\Pages;
use App\Models\PetType;
use Filament\Forms\Components\Hidden;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Actions\BulkActionGroup;
use Filament\Tables\Actions\DeleteBulkAction;
use Filament\Tables\Actions\EditAction;
use Filament\Tables\Actions\ViewAction;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\BooleanColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;

class PetTypeResource extends Resource
{
    protected static ?string $model = PetType::class;

    protected static ?string $navigationIcon = 'heroicon-o-tag';

    protected static ?string $navigationGroup = 'Pet Management';

    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                TextInput::make('name')
                    ->required()
                    ->maxLength(255)
                    ->unique(ignoreRecord: true)
                    ->live(onBlur: true)
                    ->afterStateUpdated(function (string $context, $state, callable $set) {
                        if ($context === 'create') {
                            $set('slug', \Str::slug($state));
                        }
                    }),

                TextInput::make('slug')
                    ->required()
                    ->maxLength(255)
                    ->unique(ignoreRecord: true)
                    ->rules(['regex:/^[a-z0-9-]+$/'])
                    ->helperText('Lowercase letters, numbers, and hyphens only'),

                Textarea::make('description')
                    ->maxLength(500)
                    ->rows(3),

                Toggle::make('placement_requests_allowed')
                    ->default(false)
                    ->helperText('Allow users to create placement requests for this pet type'),

                Toggle::make('weight_tracking_allowed')
                    ->label('Weight tracking allowed')
                    ->default(false)
                    ->helperText('Enable weights feature for this pet type'),
                Toggle::make('microchips_allowed')
                    ->label('Microchips allowed')
                    ->default(false)
                    ->helperText('Enable microchips feature for this pet type'),
                Toggle::make('is_active')
                    ->default(true)
                    ->helperText('Inactive pet types cannot be selected when creating new pets')
                    ->disabled(fn ($record) => $record?->slug === 'cat'), // Cat cannot be deactivated

                Hidden::make('is_system')
                    ->default(false),

                TextInput::make('display_order')
                    ->numeric()
                    ->default(0)
                    ->helperText('Lower numbers appear first in lists'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('slug')
                    ->searchable()
                    ->sortable()
                    ->badge()
                    ->color('gray'),

                TextColumn::make('description')
                    ->limit(50)
                    ->tooltip(function (TextColumn $column): ?string {
                        $state = $column->getState();
                        if (strlen($state) <= 50) {
                            return null;
                        }

                        return $state;
                    }),

                BooleanColumn::make('is_active')
                    ->sortable(),

                BooleanColumn::make('placement_requests_allowed')
                    ->label('Placements Allowed')
                    ->sortable(),

                BooleanColumn::make('weight_tracking_allowed')
                    ->label('Weights Allowed')
                    ->sortable(),
                BooleanColumn::make('microchips_allowed')
                    ->label('Microchips Allowed')
                    ->sortable(),
                BadgeColumn::make('is_system')
                    ->colors([
                        'success' => true,
                        'gray' => false,
                    ])
                    ->formatStateUsing(fn (bool $state): string => $state ? 'System' : 'Custom'),

                TextColumn::make('display_order')
                    ->sortable()
                    ->alignCenter(),

                TextColumn::make('pets_count')
                    ->counts('pets')
                    ->label('Pets')
                    ->alignCenter()
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
                TernaryFilter::make('is_active')
                    ->label('Active Status')
                    ->boolean()
                    ->trueLabel('Active only')
                    ->falseLabel('Inactive only')
                    ->native(false),

                TernaryFilter::make('is_system')
                    ->label('Type')
                    ->boolean()
                    ->trueLabel('System types')
                    ->falseLabel('Custom types')
                    ->native(false),
            ])
            ->actions([
                ViewAction::make(),
                EditAction::make()
                    ->disabled(fn ($record) => $record->slug === 'cat' && request()->has('deactivate')),
                Tables\Actions\Action::make('toggle_active')
                    ->label(fn ($record) => $record->is_active ? 'Deactivate' : 'Activate')
                    ->icon(fn ($record) => $record->is_active ? 'heroicon-o-x-circle' : 'heroicon-o-check-circle')
                    ->color(fn ($record) => $record->is_active ? 'danger' : 'success')
                    ->disabled(fn ($record) => $record->slug === 'cat' && $record->is_active) // Cannot deactivate Cat
                    ->requiresConfirmation()
                    ->modalHeading(fn ($record) => ($record->is_active ? 'Deactivate' : 'Activate').' Pet Type')
                    ->modalDescription(function ($record) {
                        if ($record->slug === 'cat' && $record->is_active) {
                            return 'Cat pet type cannot be deactivated as it is required by the system.';
                        }

                        return $record->is_active
                            ? 'This will prevent new pets of this type from being created.'
                            : 'This will allow new pets of this type to be created again.';
                    })
                    ->action(function ($record) {
                        if ($record->slug === 'cat' && $record->is_active) {
                            Notification::make()
                                ->title('Cannot deactivate Cat pet type')
                                ->body('Cat is a system pet type and cannot be deactivated.')
                                ->danger()
                                ->send();

                            return;
                        }

                        $record->update(['is_active' => ! $record->is_active]);

                        Notification::make()
                            ->title('Pet type '.($record->is_active ? 'activated' : 'deactivated'))
                            ->success()
                            ->send();
                    }),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make()
                        ->before(function ($records) {
                            // Check if any system types are being deleted
                            $systemTypes = $records->filter(fn ($record) => $record->is_system);
                            if ($systemTypes->isNotEmpty()) {
                                Notification::make()
                                    ->title('Cannot delete system pet types')
                                    ->body('System pet types (Cat, Dog) cannot be deleted.')
                                    ->danger()
                                    ->send();

                                return false; // Cancel the action
                            }

                            // Check if any types have pets
                            $typesWithPets = $records->filter(fn ($record) => $record->pets()->count() > 0);
                            if ($typesWithPets->isNotEmpty()) {
                                Notification::make()
                                    ->title('Cannot delete pet types with pets')
                                    ->body('Pet types that have pets associated with them cannot be deleted.')
                                    ->danger()
                                    ->send();

                                return false; // Cancel the action
                            }
                        }),
                ]),
            ])
            ->defaultSort('display_order');
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPetTypes::route('/'),
            'create' => Pages\CreatePetType::route('/create'),
            'view' => Pages\ViewPetType::route('/{record}'),
            'edit' => Pages\EditPetType::route('/{record}/edit'),
        ];
    }

    public static function getNavigationBadge(): ?string
    {
        return static::getModel()::count();
    }

    public static function canDelete($record): bool
    {
        // Cannot delete system types or types with pets
        return ! $record->is_system && $record->pets()->count() === 0;
    }
}
