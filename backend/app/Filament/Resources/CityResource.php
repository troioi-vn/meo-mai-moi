<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\CityResource\Pages;
use App\Models\City;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Form;
use Filament\Resources\Concerns\Translatable;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Actions\BulkActionGroup;
use Filament\Tables\Actions\DeleteBulkAction;
use Filament\Tables\Actions\EditAction;
use Filament\Tables\Actions\ViewAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class CityResource extends Resource
{
    use Translatable;

    protected static ?string $model = City::class;

    protected static ?string $navigationIcon = 'heroicon-o-building-office';

    protected static ?string $navigationGroup = 'System';

    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Section::make('General Information')
                ->schema([
                    TextInput::make('name')
                        ->required()
                        ->maxLength(100)
                        ->live(onBlur: true)
                        ->afterStateUpdated(function (string $context, $state, callable $set): void {
                            if ($context === 'create') {
                                $set('slug', Str::slug($state));
                            }
                        }),
                    TextInput::make('slug')
                        ->required()
                        ->maxLength(120)
                        ->rules(['regex:/^[a-z0-9-]+$/'])
                        ->helperText('Lowercase letters, numbers, and hyphens only'),
                    TextInput::make('country')
                        ->required()
                        ->maxLength(2)
                        ->helperText('ISO 3166-1 alpha-2'),
                    Textarea::make('description')
                        ->maxLength(500)
                        ->rows(3)
                        ->columnSpanFull(),
                ])
                ->columns(2),

            Section::make('Status & Metadata')
                ->schema([
                    Toggle::make('is_approved')
                        ->label('Approved')
                        ->dehydrated(false)
                        ->afterStateHydrated(function ($component, $record): void {
                            if ($record) {
                                $component->state($record->approved_at !== null);
                            }
                        }),
                    TextInput::make('created_by_name')
                        ->label('Created By')
                        ->disabled()
                        ->dehydrated(false)
                        ->visible(fn ($record) => $record && $record->creator)
                        ->afterStateHydrated(function ($component, $record): void {
                            if ($record && $record->creator) {
                                $component->state($record->creator->name);
                            }
                        }),
                ])
                ->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')->searchable()->sortable(),
                TextColumn::make('slug')->badge()->color('gray')->sortable(),
                TextColumn::make('country')->badge()->sortable(),
                TextColumn::make('description')
                    ->limit(40)
                    ->tooltip(fn (TextColumn $column): ?string => $column->getState()),
                TextColumn::make('approved_at')
                    ->label('Status')
                    ->badge()
                    ->getStateUsing(fn ($record) => $record->approved_at ? 'Approved' : 'Pending')
                    ->color(fn (string $state): string => match ($state) {
                        'Approved' => 'success',
                        'Pending' => 'warning',
                        default => 'gray',
                    })
                    ->sortable(),
                TextColumn::make('creator.name')
                    ->label('Created By')
                    ->default('System')
                    ->sortable(),
                TextColumn::make('usage_count')
                    ->label('Usage')
                    ->alignCenter()
                    ->sortable(query: function ($query, $direction) {
                        return $query->withCount('pets')->orderBy('pets_count', $direction);
                    }),
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
                SelectFilter::make('country')
                    ->options(
                        City::query()
                            ->select('country')
                            ->distinct()
                            ->orderBy('country')
                            ->pluck('country', 'country')
                    )
                    ->native(false),
                Tables\Filters\TernaryFilter::make('approved')
                    ->label('Approval Status')
                    ->placeholder('All')
                    ->trueLabel('Approved')
                    ->falseLabel('Pending Approval')
                    ->queries(
                        true: fn (Builder $query) => $query->whereNotNull('approved_at'),
                        false: fn (Builder $query) => $query->whereNull('approved_at'),
                    )
                    ->native(false),
            ])
            ->actions([
                ViewAction::make(),
                EditAction::make(),
                Tables\Actions\Action::make('toggle_approval')
                    ->label(fn ($record) => $record->approved_at ? 'Revoke' : 'Approve')
                    ->icon(fn ($record) => $record->approved_at ? 'heroicon-o-x-circle' : 'heroicon-o-check-circle')
                    ->color(fn ($record) => $record->approved_at ? 'danger' : 'success')
                    ->requiresConfirmation()
                    ->action(function ($record): void {
                        if ($record->approved_at) {
                            $record->update(['approved_at' => null]);
                        } else {
                            $record->update(['approved_at' => now()]);
                        }
                    }),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                    Tables\Actions\BulkAction::make('approve_selected')
                        ->label('Approve Selected')
                        ->icon('heroicon-o-check-circle')
                        ->color('success')
                        ->requiresConfirmation()
                        ->action(function ($records): void {
                            $records->each(fn ($record) => $record->update(['approved_at' => now()]));
                        }),
                ]),
            ])
            ->defaultSort('name');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCities::route('/'),
            'create' => Pages\CreateCity::route('/create'),
            'view' => Pages\ViewCity::route('/{record}'),
            'edit' => Pages\EditCity::route('/{record}/edit'),
        ];
    }
}
