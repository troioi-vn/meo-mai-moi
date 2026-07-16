<?php

declare(strict_types=1);

namespace App\Filament\Resources\GroupResource\RelationManagers;

use App\Enums\GroupRole;
use App\Exceptions\GroupException;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\User;
use App\Services\Groups\GroupMembershipService;
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
                Tables\Columns\TextColumn::make('role')->badge()->sortable(),
                Tables\Columns\TextColumn::make('invitedBy.name')->label('Invited by')->placeholder('Creator'),
                Tables\Columns\TextColumn::make('start_at')->dateTime()->sortable(),
                Tables\Columns\TextColumn::make('end_at')->dateTime()->placeholder('Active')->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('role')->options(GroupRole::class),
                Tables\Filters\TernaryFilter::make('active')
                    ->queries(
                        true: fn (Builder $query): Builder => $query->whereNull('end_at'),
                        false: fn (Builder $query): Builder => $query->whereNotNull('end_at'),
                    ),
            ])
            ->actions([
                Actions\Action::make('remove_membership')
                    ->label('Remove')
                    ->icon('heroicon-o-user-minus')
                    ->color('danger')
                    ->visible(fn (GroupMembership $record): bool => $record->isActive())
                    ->requiresConfirmation()
                    ->action(function (GroupMembership $record): void {
                        try {
                            app(GroupMembershipService::class)
                                ->removeMemberAsModerator(
                                    $this->group(),
                                    User::query()->findOrFail($record->user_id),
                                );
                            Notification::make()->title('Group membership removed')->success()->send();
                        } catch (GroupException $exception) {
                            Notification::make()
                                ->title('Membership could not be removed')
                                ->body(__('groups.'.$exception->getMessage()))
                                ->danger()
                                ->send();
                        }
                    }),
            ])
            ->defaultSort('start_at', 'desc');
    }

    private function group(): Group
    {
        $owner = $this->getOwnerRecord();

        if (! $owner instanceof Group) {
            throw new \LogicException('Group relation manager requires a group owner.');
        }

        return $owner;
    }
}
