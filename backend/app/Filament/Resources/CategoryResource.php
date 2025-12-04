<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CategoryResource\Pages;
use App\Models\Category;
use App\Models\PetType;
use Filament\Forms\Components\Select;
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
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Support\Str;

class CategoryResource extends Resource
{
    protected static ?string $model = Category::class;

    protected static ?string $navigationIcon = 'heroicon-o-tag';

    protected static ?string $navigationGroup = 'System';

    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                TextInput::make('name')
                    ->required()
                    ->maxLength(50)
                    ->live(onBlur: true)
                    ->afterStateUpdated(function (string $context, $state, callable $set) {
                        if ($context === 'create') {
                            $set('slug', Str::slug($state));
                        }
                    }),

                TextInput::make('slug')
                    ->required()
                    ->maxLength(60)
                    ->rules(['regex:/^[a-z0-9-]+$/'])
                    ->helperText('Lowercase letters, numbers, and hyphens only'),

                Select::make('pet_type_id')
                    ->label('Pet Type')
                    ->options(PetType::active()->ordered()->pluck('name', 'id'))
                    ->required()
                    ->searchable()
                    ->preload(),

                Textarea::make('description')
                    ->maxLength(500)
                    ->rows(3),

                Toggle::make('is_approved')
                    ->label('Approved')
                    ->helperText('Approved categories are visible to all users')
                    ->dehydrated(false)
                    ->afterStateHydrated(function ($component, $record) {
                        if ($record) {
                            $component->state($record->approved_at !== null);
                        }
                    }),

                TextInput::make('created_by_name')
                    ->label('Created By')
                    ->disabled()
                    ->dehydrated(false)
                    ->visible(fn ($record) => $record && $record->creator)
                    ->afterStateHydrated(function ($component, $record) {
                        if ($record && $record->creator) {
                            $component->state($record->creator->name);
                        }
                    }),
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

                TextColumn::make('petType.name')
                    ->label('Pet Type')
                    ->sortable()
                    ->badge()
                    ->color('info'),

                TextColumn::make('description')
                    ->limit(40)
                    ->tooltip(function (TextColumn $column): ?string {
                        $state = $column->getState();
                        if ($state && strlen($state) <= 40) {
                            return null;
                        }

                        return $state;
                    }),

                BadgeColumn::make('approved_at')
                    ->label('Status')
                    ->getStateUsing(fn ($record) => $record->approved_at ? 'Approved' : 'Pending')
                    ->colors([
                        'success' => 'Approved',
                        'warning' => 'Pending',
                    ])
                    ->sortable(),

                TextColumn::make('creator.name')
                    ->label('Created By')
                    ->default('System')
                    ->sortable(),

                TextColumn::make('usage_count')
                    ->label('Usage')
                    ->alignCenter()
                    ->sortable(query: function ($query, $direction) {
                        return $query->withCount('pets')
                            ->orderBy('pets_count', $direction);
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
                SelectFilter::make('pet_type_id')
                    ->label('Pet Type')
                    ->options(PetType::active()->ordered()->pluck('name', 'id'))
                    ->native(false),

                SelectFilter::make('status')
                    ->label('Approval Status')
                    ->options([
                        'approved' => 'Approved',
                        'pending' => 'Pending Approval',
                    ])
                    ->query(function ($query, array $data) {
                        return match ($data['value'] ?? null) {
                            'approved' => $query->whereNotNull('approved_at'),
                            'pending' => $query->whereNull('approved_at'),
                            default => $query,
                        };
                    })
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
                    ->modalHeading(fn ($record) => ($record->approved_at ? 'Revoke Approval for' : 'Approve').' Category')
                    ->modalDescription(fn ($record) => $record->approved_at
                        ? 'This will hide the category from users who did not create it.'
                        : 'This will make the category visible to all users.')
                    ->action(function ($record) {
                        if ($record->approved_at) {
                            $record->update(['approved_at' => null]);
                            Notification::make()
                                ->title('Approval revoked')
                                ->success()
                                ->send();
                        } else {
                            $record->update(['approved_at' => now()]);
                            Notification::make()
                                ->title('Category approved')
                                ->success()
                                ->send();
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
                        ->action(function ($records) {
                            $records->each(fn ($record) => $record->update(['approved_at' => now()]));
                            Notification::make()
                                ->title('Categories approved')
                                ->success()
                                ->send();
                        }),
                ]),
            ])
            ->defaultSort('name');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCategories::route('/'),
            'create' => Pages\CreateCategory::route('/create'),
            'view' => Pages\ViewCategory::route('/{record}'),
            'edit' => Pages\EditCategory::route('/{record}/edit'),
        ];
    }
}
