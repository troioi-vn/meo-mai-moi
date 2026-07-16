<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\CurrencyResource\Pages;
use App\Models\Currency;
use Filament\Actions\EditAction;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;

class CurrencyResource extends Resource
{
    protected static ?string $model = Currency::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-banknotes';

    protected static string|\UnitEnum|null $navigationGroup = 'System';

    protected static ?string $navigationLabel = 'Finance currencies';

    protected static ?string $recordTitleAttribute = 'code';

    public static function form(Schema $form): Schema
    {
        return $form->schema([Section::make('ISO 4217 currency')->schema([
            TextInput::make('code')->disabled(), TextInput::make('name')->disabled(),
            TextInput::make('symbol')->disabled(), TextInput::make('minor_units')->disabled(),
            Toggle::make('enabled')->label('Available for new Ledgers')->helperText('Existing Ledgers remain valid when disabled.'),
        ])->columns(2)]);
    }

    public static function table(Table $table): Table
    {
        return $table->columns([
            TextColumn::make('code')->badge()->sortable()->searchable(),
            TextColumn::make('name')->sortable()->searchable(), TextColumn::make('symbol'),
            TextColumn::make('minor_units')->label('Minor units')->sortable(),
            IconColumn::make('enabled')->boolean()->label('Available'),
            TextColumn::make('ledgers_count')->counts('ledgers')->label('Ledgers'),
        ])->filters([TernaryFilter::make('enabled')->label('Availability')])->actions([EditAction::make()])->defaultSort('code');
    }

    public static function getPages(): array
    {
        return ['index' => Pages\ListCurrencies::route('/'), 'edit' => Pages\EditCurrency::route('/{record}/edit')];
    }
}
