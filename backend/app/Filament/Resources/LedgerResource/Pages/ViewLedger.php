<?php

declare(strict_types=1);

namespace App\Filament\Resources\LedgerResource\Pages;

use App\Filament\Resources\LedgerResource;
use Filament\Infolists\Components\TextEntry;
use Filament\Resources\Pages\ViewRecord;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class ViewLedger extends ViewRecord
{
    protected static string $resource = LedgerResource::class;

    public function infolist(Schema $infolist): Schema
    {
        return $infolist->schema([
            Section::make('Ledger')
                ->schema([
                    TextEntry::make('title'),
                    TextEntry::make('currency_code')->label('Currency'),
                    TextEntry::make('group.name')->label('Linked group')->placeholder('Personal ledger'),
                    TextEntry::make('sync_group_pets')->label('Sync group pets')->badge()
                        ->formatStateUsing(fn (bool $state): string => $state ? 'Enabled' : 'Disabled'),
                    TextEntry::make('creator.name')->label('Created by'),
                    TextEntry::make('archived_at')->label('Archived')->dateTime()->placeholder('Active'),
                    TextEntry::make('created_at')->dateTime(),
                    TextEntry::make('updated_at')->dateTime(),
                ])
                ->columns(2),
        ]);
    }
}
