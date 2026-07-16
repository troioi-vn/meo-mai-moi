<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\HabitResource\Pages;
use App\Filament\Resources\HabitResource\RelationManagers;
use App\Models\Habit;
use App\Models\User;
use App\Services\HabitLifecycleService;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class HabitResource extends Resource
{
    protected static ?string $model = Habit::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-check-circle';

    protected static string|\UnitEnum|null $navigationGroup = 'User features';

    protected static ?int $navigationSort = 7;

    public static function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query): Builder => $query
                ->with('creator')
                ->withCount(['pets', 'entries']))
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('creator.name')
                    ->label('Creator')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('value_type')
                    ->label('Value Type')
                    ->badge(),
                Tables\Columns\TextColumn::make('timezone')
                    ->sortable(),
                Tables\Columns\TextColumn::make('pets_count')
                    ->label('Pets')
                    ->sortable(),
                Tables\Columns\TextColumn::make('entries_count')
                    ->label('Entries')
                    ->sortable(),
                Tables\Columns\IconColumn::make('share_with_coowners')
                    ->label('Shared')
                    ->boolean(),
                Tables\Columns\IconColumn::make('reminder_enabled')
                    ->label('Reminders')
                    ->boolean(),
                Tables\Columns\TextColumn::make('archived_at')
                    ->label('Archived')
                    ->dateTime()
                    ->placeholder('Active')
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('archived')
                    ->nullable()
                    ->queries(
                        true: fn (Builder $query): Builder => $query->whereNotNull('archived_at'),
                        false: fn (Builder $query): Builder => $query->whereNull('archived_at'),
                        blank: fn (Builder $query): Builder => $query,
                    ),
                Tables\Filters\TernaryFilter::make('share_with_coowners')
                    ->label('Shared with co-owners'),
                Tables\Filters\TernaryFilter::make('reminder_enabled')
                    ->label('Reminders enabled'),
            ])
            ->actions([
                Actions\ViewAction::make(),
                static::archiveAction(),
                static::restoreAction(),
                static::deleteAction(),
            ])
            ->bulkActions([])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\PetsRelationManager::class,
            RelationManagers\EntriesRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListHabits::route('/'),
            'view' => Pages\ViewHabit::route('/{record}'),
        ];
    }

    public static function canAccess(): bool
    {
        $user = auth()->user();

        return $user instanceof User && $user->hasRole(['admin', 'super_admin']);
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canView(Model $record): bool
    {
        return static::canAccess();
    }

    public static function canEdit(Model $record): bool
    {
        return false;
    }

    public static function canDelete(Model $record): bool
    {
        return static::canAccess();
    }

    public static function archiveAction(): Actions\Action
    {
        return Actions\Action::make('archive')
            ->icon('heroicon-o-archive-box')
            ->color('warning')
            ->visible(fn (Habit $record): bool => ! $record->isArchived())
            ->requiresConfirmation()
            ->action(function (Habit $record): void {
                app(HabitLifecycleService::class)->archive($record);

                Notification::make()->title('Habit archived')->success()->send();
            });
    }

    public static function restoreAction(): Actions\Action
    {
        return Actions\Action::make('restore')
            ->icon('heroicon-o-arrow-path')
            ->color('success')
            ->visible(fn (Habit $record): bool => $record->isArchived())
            ->requiresConfirmation()
            ->action(function (Habit $record): void {
                app(HabitLifecycleService::class)->restore($record);

                Notification::make()->title('Habit restored')->success()->send();
            });
    }

    public static function deleteAction(): Actions\DeleteAction
    {
        return Actions\DeleteAction::make()
            ->using(function (Habit $record): bool {
                return app(HabitLifecycleService::class)->delete($record);
            });
    }
}
