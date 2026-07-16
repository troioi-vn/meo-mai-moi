<?php

declare(strict_types=1);

namespace App\Filament\Resources\LedgerResource\RelationManagers;

use App\Enums\ResourceInvitationStatus;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

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
            ->columns([
                Tables\Columns\TextColumn::make('invitation.id')->label('ID')->sortable(),
                Tables\Columns\TextColumn::make('invitation.status')->label('Status')->badge()->sortable(),
                Tables\Columns\TextColumn::make('invitation.inviter.name')->label('Invited by')->searchable(),
                Tables\Columns\TextColumn::make('invitation.acceptedBy.name')->label('Accepted by')->searchable()->placeholder('—'),
                Tables\Columns\TextColumn::make('invitation.expires_at')->label('Expires')->dateTime()->sortable(),
                Tables\Columns\TextColumn::make('invitation.created_at')->label('Created')->dateTime()->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options(ResourceInvitationStatus::class)
                    ->query(fn ($query, array $data) => filled($data['value'] ?? null)
                        ? $query->whereHas('invitation', fn ($invitation) => $invitation->where('status', $data['value']))
                        : $query),
            ])
            ->defaultSort('resource_invitation_id', 'desc');
    }
}
