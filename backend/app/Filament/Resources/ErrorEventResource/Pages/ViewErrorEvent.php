<?php

declare(strict_types=1);

namespace App\Filament\Resources\ErrorEventResource\Pages;

use App\Filament\Resources\ErrorEventResource;
use Filament\Infolists\Components\TextEntry;
use Filament\Resources\Pages\ViewRecord;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class ViewErrorEvent extends ViewRecord
{
    protected static string $resource = ErrorEventResource::class;

    public function infolist(Schema $infolist): Schema
    {
        return $infolist->schema([
            Section::make('Error event')
                ->schema([
                    TextEntry::make('occurred_at')->dateTime(),
                    TextEntry::make('source')->badge(),
                    TextEntry::make('exception_class')->placeholder('Unknown'),
                    TextEntry::make('status_code')->placeholder('—'),
                    TextEntry::make('route'),
                    TextEntry::make('method')->placeholder('—'),
                    TextEntry::make('app_version')->placeholder('Unknown'),
                    TextEntry::make('user_id')->label('User ID')->placeholder('Guest'),
                    TextEntry::make('fingerprint')->copyable()->columnSpanFull(),
                    TextEntry::make('message')->columnSpanFull(),
                    TextEntry::make('stack')->placeholder('No stack supplied')->columnSpanFull(),
                    TextEntry::make('context')
                        ->formatStateUsing(fn (mixed $state): string => json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) ?: 'No context supplied')
                        ->columnSpanFull(),
                ])
                ->columns(2),
        ]);
    }
}
