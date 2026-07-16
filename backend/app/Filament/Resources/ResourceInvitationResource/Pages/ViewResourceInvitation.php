<?php

declare(strict_types=1);

namespace App\Filament\Resources\ResourceInvitationResource\Pages;

use App\Filament\Resources\ResourceInvitationResource;
use App\Models\ResourceInvitation;
use Filament\Infolists\Components\TextEntry;
use Filament\Resources\Pages\ViewRecord;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class ViewResourceInvitation extends ViewRecord
{
    protected static string $resource = ResourceInvitationResource::class;

    public function infolist(Schema $infolist): Schema
    {
        return $infolist->schema([
            Section::make('Sharing Details')
                ->schema([
                    TextEntry::make('type')->badge(),
                    TextEntry::make('target')
                        ->getStateUsing(fn (ResourceInvitation $record): string => ResourceInvitationResource::targetLabel($record)),
                    TextEntry::make('role')
                        ->getStateUsing(fn (ResourceInvitation $record): string => ResourceInvitationResource::roleLabel($record))
                        ->badge(),
                    TextEntry::make('status')->badge(),
                    TextEntry::make('inviter.name')->label('Inviter'),
                    TextEntry::make('inviter.email')->label('Inviter Email'),
                    TextEntry::make('acceptedBy.name')
                        ->label('Recipient')
                        ->placeholder('Not accepted'),
                    TextEntry::make('acceptedBy.email')
                        ->label('Recipient Email')
                        ->placeholder('Not accepted'),
                ])
                ->columns(2),
            Section::make('Lifecycle')
                ->schema([
                    TextEntry::make('created_at')->label('Created')->dateTime(),
                    TextEntry::make('expires_at')->label('Expires')->dateTime(),
                    TextEntry::make('accepted_at')->label('Accepted')->dateTime()->placeholder('—'),
                    TextEntry::make('declined_at')->label('Declined')->dateTime()->placeholder('—'),
                    TextEntry::make('revoked_at')->label('Revoked')->dateTime()->placeholder('—'),
                    TextEntry::make('updated_at')->label('Last Updated')->dateTime(),
                ])
                ->columns(3),
        ]);
    }

    protected function getHeaderActions(): array
    {
        return [
            ResourceInvitationResource::revokeAction(),
        ];
    }
}
