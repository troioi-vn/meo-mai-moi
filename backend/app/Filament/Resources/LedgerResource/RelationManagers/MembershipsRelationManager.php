<?php

declare(strict_types=1);

namespace App\Filament\Resources\LedgerResource\RelationManagers;

use App\Exceptions\FinanceException;
use App\Models\Ledger;
use App\Models\LedgerMembership;
use App\Models\User;
use App\Services\Finance\LedgerService;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class MembershipsRelationManager extends RelationManager
{
    protected static string $relationship = 'memberships';

    protected static ?string $title = 'Members';

    public function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('user.name')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('user.email')->searchable(),
                Tables\Columns\TextColumn::make('invitedBy.name')->label('Invited by')->placeholder('Creator'),
                Tables\Columns\TextColumn::make('start_at')->dateTime()->sortable(),
                Tables\Columns\TextColumn::make('end_at')->dateTime()->sortable()->placeholder('Active'),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('active')
                    ->queries(
                        true: fn (Builder $query): Builder => $query->whereNull('end_at'),
                        false: fn (Builder $query): Builder => $query->whereNotNull('end_at'),
                    ),
            ])
            ->actions([
                Actions\Action::make('end_membership')
                    ->label('End membership')
                    ->icon('heroicon-o-user-minus')
                    ->color('danger')
                    ->visible(fn (LedgerMembership $record): bool => $record->end_at === null)
                    ->requiresConfirmation()
                    ->action(function (LedgerMembership $record): void {
                        try {
                            app(LedgerService::class)->endMembership(
                                $this->ledger(),
                                User::query()->findOrFail($record->user_id),
                            );
                            Notification::make()->title('Membership ended')->success()->send();
                        } catch (FinanceException $exception) {
                            Notification::make()
                                ->title('Membership could not be ended')
                                ->body($exception->getMessage())
                                ->danger()
                                ->send();
                        }
                    }),
            ])
            ->defaultSort('start_at', 'desc');
    }

    private function ledger(): Ledger
    {
        $owner = $this->getOwnerRecord();

        if (! $owner instanceof Ledger) {
            throw new \LogicException('Ledger relation manager requires a ledger owner.');
        }

        return $owner;
    }
}
