<?php

declare(strict_types=1);

namespace App\Filament\Resources\LitterResource\Pages;

use App\Filament\Resources\LitterResource;
use App\Filament\Resources\PetResource;
use Filament\Infolists\Components\RepeatableEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Resources\Pages\ViewRecord;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class ViewLitter extends ViewRecord
{
    protected static string $resource = LitterResource::class;

    public function infolist(Schema $infolist): Schema
    {
        return $infolist->schema([
            Section::make('Litter Details')
                ->schema([
                    TextEntry::make('name'),
                    TextEntry::make('petType.name')
                        ->label('Pet Type')
                        ->badge(),
                    TextEntry::make('creator.name')
                        ->label('Created by')
                        ->placeholder('—')
                        ->formatStateUsing(function (?string $state, $record): string {
                            if ($state !== null && $state !== '') {
                                return $state;
                            }

                            $email = $record->creator ? $record->creator->email : null;

                            return $email ?? '—';
                        }),
                    TextEntry::make('creator.email')
                        ->label('Creator Email')
                        ->placeholder('—'),
                    TextEntry::make('pets_count')
                        ->label('Members')
                        ->state(fn ($record) => $record->pets()->count()),
                    TextEntry::make('created_at')
                        ->label('Created')
                        ->dateTime(),
                    TextEntry::make('updated_at')
                        ->label('Updated')
                        ->dateTime(),
                ])
                ->columns(2),
            Section::make('Member Pets')
                ->schema([
                    RepeatableEntry::make('pets')
                        ->label('')
                        ->schema([
                            TextEntry::make('name')
                                ->label('Name')
                                ->url(fn ($record) => PetResource::canView($record) ? PetResource::getUrl('view', ['record' => $record]) : null)
                                ->openUrlInNewTab(false),
                            TextEntry::make('sex')
                                ->badge(),
                            TextEntry::make('status')
                                ->badge(),
                            TextEntry::make('birthday')
                                ->date()
                                ->placeholder('—'),
                            TextEntry::make('created_at')
                                ->label('Created')
                                ->dateTime()
                                ->placeholder('—'),
                        ])
                        ->columns(3)
                        ->columnSpanFull(),
                ])
                ->visible(fn ($record) => $record->pets()->exists()),
            Section::make('Member Pets')
                ->schema([
                    TextEntry::make('empty')
                        ->label('')
                        ->state('No member pets')
                        ->hiddenLabel(),
                ])
                ->visible(fn ($record) => ! $record->pets()->exists()),
        ]);
    }

    protected function getHeaderActions(): array
    {
        return [];
    }
}
