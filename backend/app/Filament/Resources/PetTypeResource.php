<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Enums\PetTypeStatus;
use App\Filament\Resources\PetTypeResource\Pages;
use App\Models\PetType;
use Filament\Forms\Components\Hidden;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Concerns\Translatable;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Actions\BulkActionGroup;
use Filament\Tables\Actions\DeleteBulkAction;
use Filament\Tables\Actions\EditAction;
use Filament\Tables\Actions\ViewAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;
use Illuminate\Support\Str;

class PetTypeResource extends Resource
{
    use Translatable;

    protected static ?string $model = PetType::class;

    protected static ?string $navigationIcon = 'heroicon-o-tag';

    protected static ?string $navigationGroup = 'Pet Management';

    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                \Filament\Forms\Components\Section::make('Basic Information')
                    ->schema([
                        TextInput::make('name')
                            ->required()
                            ->maxLength(255)
                            ->live(onBlur: true)
                            ->afterStateUpdated(function (string $context, $state, callable $set): void {
                                if ($context === 'create') {
                                    $set('slug', Str::slug($state));
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
                            ->rows(3)
                            ->columnSpanFull(),
                    ])->columns(2),

                \Filament\Forms\Components\Section::make('Capabilities & Status')
                    ->schema([
                        Toggle::make('placement_requests_allowed')
                            ->label('Placement requests allowed')
                            ->default(false)
                            ->helperText('Allow users to create placement requests for this pet type'),

                        Toggle::make('weight_tracking_allowed')
                            ->label('Weight tracking allowed')
                            ->default(false)
                            ->helperText('Enable weight tracking feature for this pet type'),

                        Toggle::make('microchips_allowed')
                            ->label('Microchips allowed')
                            ->default(false)
                            ->helperText('Enable microchips feature for this pet type'),

                        Select::make('status')
                            ->options(PetTypeStatus::class)
                            ->default(PetTypeStatus::ACTIVE)
                            ->required()
                            ->helperText('Inactive pet types cannot be selected when creating new pets')
                            ->disabled(fn ($record) => $record?->slug === 'cat'), // Cat cannot be deactivated

                        TextInput::make('display_order')
                            ->numeric()
                            ->default(0)
                            ->helperText('Lower numbers appear first in lists'),

                        Hidden::make('is_system')
                            ->default(false),
                    ])->columns(2),
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

                TextColumn::make('status')
                    ->badge()
                    ->sortable(),

                IconColumn::make('placement_requests_allowed')
                    ->label('Placements Allowed')
                    ->boolean()
                    ->sortable(),

                // Show capability flags
                IconColumn::make('weight_tracking_allowed')
                    ->label('Weights Allowed')
                    ->boolean()
                    ->sortable(),
                IconColumn::make('microchips_allowed')
                    ->label('Microchips Allowed')
                    ->boolean()
                    ->sortable(),

                TextColumn::make('is_system')
                    ->badge()
                    ->color(fn (bool $state): string => $state ? 'success' : 'gray')
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
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        PetTypeStatus::ACTIVE->value => 'Active',
                        PetTypeStatus::INACTIVE->value => 'Inactive',
                        PetTypeStatus::ARCHIVED->value => 'Archived',
                    ])
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
                    ->label(fn ($record) => $record->isActive() ? 'Deactivate' : 'Activate')
                    ->icon(fn ($record) => $record->isActive() ? 'heroicon-o-x-circle' : 'heroicon-o-check-circle')
                    ->color(fn ($record) => $record->isActive() ? 'danger' : 'success')
                    ->disabled(fn ($record) => $record->slug === 'cat' && $record->isActive()) // Cannot deactivate Cat
                    ->requiresConfirmation()
                    ->modalHeading(fn ($record) => ($record->isActive() ? 'Deactivate' : 'Activate').' Pet Type')
                    ->modalDescription(function ($record) {
                        if ($record->slug === 'cat' && $record->isActive()) {
                            return 'Cat pet type cannot be deactivated as it is required by the system.';
                        }

                        return $record->isActive()
                            ? 'This will prevent new pets of this type from being created.'
                            : 'This will allow new pets of this type to be created again.';
                    })
                    ->action(function ($record): void {
                        if ($record->slug === 'cat' && $record->isActive()) {
                            Notification::make()
                                ->title('Cannot deactivate Cat pet type')
                                ->body('Cat is a system pet type and cannot be deactivated.')
                                ->danger()
                                ->send();

                            return;
                        }

                        if ($record->isActive()) {
                            $record->markAsInactive();
                        } else {
                            $record->markAsActive();
                        }

                        Notification::make()
                            ->title('Pet type '.($record->isActive() ? 'activated' : 'deactivated'))
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
        $count = static::getModel()::count();

        return $count > 0 ? (string) $count : null;
    }

    public static function canDelete($record): bool
    {
        // Cannot delete system types or types with pets
        return ! $record->is_system && $record->pets()->count() === 0;
    }
}
