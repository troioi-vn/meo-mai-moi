<?php

declare(strict_types=1);

namespace App\Filament\Resources\GroupResource\RelationManagers;

use App\Enums\GroupRole;
use App\Enums\ResourceInvitationStatus;
use App\Models\GroupResourceInvitation;
use App\Services\ResourceInvitationService;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use RuntimeException;

class InvitationsRelationManager extends RelationManager
{
    protected static string $relationship = 'resourceInvitations';

    protected static ?string $title = 'Invitations';

    public function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query): Builder => $query->with('invitation'))
            ->columns([
                Tables\Columns\TextColumn::make('invitation.id')->label('ID')->sortable(),
                Tables\Columns\TextColumn::make('role')->badge()->sortable(),
                Tables\Columns\TextColumn::make('invitation.status')->label('Status')->badge()->sortable(),
                Tables\Columns\TextColumn::make('invitation.inviter.name')->label('Invited by')->searchable(),
                Tables\Columns\TextColumn::make('invitation.acceptedBy.name')->label('Accepted by')->searchable()->placeholder('—'),
                Tables\Columns\TextColumn::make('invitation.expires_at')->label('Expires')->dateTime()->sortable(),
                Tables\Columns\TextColumn::make('invitation.created_at')->label('Created')->dateTime()->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('role')->options(GroupRole::class),
                Tables\Filters\SelectFilter::make('status')
                    ->options(ResourceInvitationStatus::class)
                    ->query(fn ($query, array $data) => filled($data['value'] ?? null)
                        ? $query->whereHas('invitation', fn ($invitation) => $invitation->where('status', $data['value']))
                        : $query),
            ])
            ->defaultSort('resource_invitation_id', 'desc')
            ->actions([
                Actions\Action::make('revoke')
                    ->icon('heroicon-o-x-mark')
                    ->color('danger')
                    ->visible(fn (GroupResourceInvitation $record): bool => $record->invitation?->isPendingAndUnexpired() ?? false)
                    ->requiresConfirmation()
                    ->action(function (GroupResourceInvitation $record): void {
                        $invitation = $record->invitation;

                        if ($invitation === null || ! $invitation->isPendingAndUnexpired()) {
                            Notification::make()
                                ->title('Invitation is no longer revocable')
                                ->danger()
                                ->send();

                            return;
                        }

                        try {
                            app(ResourceInvitationService::class)->revoke($invitation);

                            Notification::make()
                                ->title('Resource invitation revoked')
                                ->success()
                                ->send();
                        } catch (RuntimeException) {
                            Notification::make()
                                ->title('Invitation is no longer revocable')
                                ->danger()
                                ->send();
                        }
                    }),
            ]);
    }
}
