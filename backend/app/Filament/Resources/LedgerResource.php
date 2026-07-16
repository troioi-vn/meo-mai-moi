<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Exceptions\FinanceException;
use App\Filament\Resources\LedgerResource\Pages;
use App\Filament\Resources\LedgerResource\RelationManagers;
use App\Models\Ledger;
use App\Services\Finance\LedgerService;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class LedgerResource extends Resource
{
    protected static ?string $model = Ledger::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-banknotes';

    protected static string|\UnitEnum|null $navigationGroup = 'User features';

    protected static ?int $navigationSort = 6;

    protected static ?string $recordTitleAttribute = 'title';

    public static function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable(),
                Tables\Columns\TextColumn::make('title')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('currency_code')->label('Currency')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('group.name')->label('Group')->searchable()->sortable()->placeholder('Personal'),
                Tables\Columns\TextColumn::make('active_memberships_count')
                    ->label('Members')->counts('activeMemberships')->sortable(),
                Tables\Columns\TextColumn::make('transactions_count')
                    ->label('Transactions')->counts('transactions')->sortable(),
                Tables\Columns\TextColumn::make('archived_at')
                    ->label('Status')
                    ->badge()
                    ->formatStateUsing(fn ($state): string => $state === null ? 'Active' : 'Archived')
                    ->color(fn ($state): string => $state === null ? 'success' : 'gray'),
                Tables\Columns\TextColumn::make('creator.name')->label('Created by')->searchable()->toggleable(),
                Tables\Columns\TextColumn::make('created_at')->dateTime()->sortable()->toggleable(),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('archived')
                    ->queries(
                        true: fn (Builder $query): Builder => $query->whereNotNull('archived_at'),
                        false: fn (Builder $query): Builder => $query->whereNull('archived_at'),
                    ),
                Tables\Filters\SelectFilter::make('currency_code')
                    ->label('Currency')
                    ->options(fn (): array => Ledger::query()->distinct()->orderBy('currency_code')
                        ->pluck('currency_code', 'currency_code')->all()),
                Tables\Filters\SelectFilter::make('group')->relationship('group', 'name')->searchable()->preload(),
            ])
            ->actions([
                Actions\ViewAction::make(),
                Actions\Action::make('archive')
                    ->icon('heroicon-o-archive-box')
                    ->color('warning')
                    ->visible(fn (Ledger $record): bool => ! $record->isArchived())
                    ->requiresConfirmation()
                    ->action(function (Ledger $record): void {
                        app(LedgerService::class)->archive($record);
                        Notification::make()->title('Ledger archived')->success()->send();
                    }),
                Actions\Action::make('restore')
                    ->icon('heroicon-o-arrow-path')
                    ->color('success')
                    ->visible(fn (Ledger $record): bool => $record->isArchived())
                    ->requiresConfirmation()
                    ->action(function (Ledger $record): void {
                        app(LedgerService::class)->restore($record);
                        Notification::make()->title('Ledger restored')->success()->send();
                    }),
                Actions\Action::make('delete_empty')
                    ->label('Delete empty')
                    ->icon('heroicon-o-trash')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalDescription('Only a ledger with no current or deleted transactions can be deleted.')
                    ->action(function (Ledger $record): void {
                        try {
                            app(LedgerService::class)->deleteEmpty($record);
                            Notification::make()->title('Empty ledger deleted')->success()->send();
                        } catch (FinanceException $exception) {
                            Notification::make()
                                ->title('Ledger could not be deleted')
                                ->body($exception->getMessage())
                                ->danger()
                                ->send();
                        }
                    }),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\MembershipsRelationManager::class,
            RelationManagers\TransactionsRelationManager::class,
            RelationManagers\AccountsRelationManager::class,
            RelationManagers\CategoriesRelationManager::class,
            RelationManagers\PetsRelationManager::class,
            RelationManagers\InvitationsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListLedgers::route('/'),
            'view' => Pages\ViewLedger::route('/{record}'),
        ];
    }

    public static function canAccess(): bool
    {
        return auth()->check() && auth()->user()->hasRole(['admin', 'super_admin']);
    }

    public static function canViewAny(): bool
    {
        return static::canAccess();
    }

    public static function canView(Model $record): bool
    {
        return static::canAccess();
    }
}
