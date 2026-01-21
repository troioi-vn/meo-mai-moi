<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\PetMicrochipResource\Pages;
use App\Models\PetMicrochip;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables\Actions\BulkActionGroup;
use Filament\Tables\Actions\DeleteAction;
use Filament\Tables\Actions\DeleteBulkAction;
use Filament\Tables\Actions\EditAction;
use Filament\Tables\Actions\ViewAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class PetMicrochipResource extends Resource
{
    protected static ?string $model = PetMicrochip::class;

    protected static ?string $navigationIcon = 'heroicon-o-tag';

    protected static ?string $navigationGroup = 'Pet Management';

    protected static ?int $navigationSort = 4;

    protected static ?string $navigationLabel = 'Microchips';

    protected static ?string $modelLabel = 'Pet Microchip';

    protected static ?string $pluralModelLabel = 'Pet Microchips';

    protected static ?string $recordTitleAttribute = 'chip_number';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Microchip Details')
                    ->schema([
                        Forms\Components\Select::make('pet_id')
                            ->label('Pet')
                            ->relationship('pet', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),

                        Forms\Components\TextInput::make('chip_number')
                            ->label('Microchip Number')
                            ->required()
                            ->maxLength(255)
                            ->unique(ignoreRecord: true)
                            ->helperText('The unique identifier of the microchip'),

                        Forms\Components\TextInput::make('issuer')
                            ->label('Issuer/Manufacturer')
                            ->maxLength(255)
                            ->helperText('The manufacturer of the microchip'),

                        Forms\Components\DatePicker::make('implanted_at')
                            ->label('Implantation Date')
                            ->maxDate(now()),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('pet.name')
                    ->label('Pet')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('chip_number')
                    ->label('Microchip Number')
                    ->searchable()
                    ->sortable()
                    ->copyable()
                    ->copyMessage('Microchip number copied'),

                TextColumn::make('issuer')
                    ->label('Issuer')
                    ->placeholder('Unknown')
                    ->sortable(),

                TextColumn::make('implanted_at')
                    ->label('Implanted')
                    ->date()
                    ->sortable()
                    ->placeholder('Not recorded'),

                TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('pet_id')
                    ->label('Pet')
                    ->relationship('pet', 'name')
                    ->searchable()
                    ->preload(),
            ])
            ->actions([
                ViewAction::make(),
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('implanted_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPetMicrochips::route('/'),
            'create' => Pages\CreatePetMicrochip::route('/create'),
            'view' => Pages\ViewPetMicrochip::route('/{record}'),
            'edit' => Pages\EditPetMicrochip::route('/{record}/edit'),
        ];
    }
}
