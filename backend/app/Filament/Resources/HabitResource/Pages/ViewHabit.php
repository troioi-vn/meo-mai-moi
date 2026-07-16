<?php

declare(strict_types=1);

namespace App\Filament\Resources\HabitResource\Pages;

use App\Filament\Resources\HabitResource;
use Filament\Infolists\Components\IconEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Resources\Pages\ViewRecord;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class ViewHabit extends ViewRecord
{
    protected static string $resource = HabitResource::class;

    public function infolist(Schema $infolist): Schema
    {
        return $infolist->schema([
            Section::make('Habit Configuration')
                ->schema([
                    TextEntry::make('name'),
                    TextEntry::make('creator.name')->label('Creator'),
                    TextEntry::make('creator.email')->label('Creator Email'),
                    TextEntry::make('timezone'),
                    TextEntry::make('value_type')->label('Value Type')->badge(),
                    TextEntry::make('day_summary_mode')->label('Day Summary')->badge(),
                    TextEntry::make('scale_min')->label('Scale Minimum')->placeholder('—'),
                    TextEntry::make('scale_max')->label('Scale Maximum')->placeholder('—'),
                ])
                ->columns(2),
            Section::make('Reminders and Sharing')
                ->schema([
                    IconEntry::make('share_with_coowners')
                        ->label('Shared with Co-owners')
                        ->boolean(),
                    IconEntry::make('reminder_enabled')
                        ->label('Reminders Enabled')
                        ->boolean(),
                    TextEntry::make('reminder_time')
                        ->label('Reminder Time')
                        ->placeholder('—'),
                    TextEntry::make('reminder_weekdays')
                        ->label('Reminder Weekdays')
                        ->formatStateUsing(fn (?array $state): string => $state === null ? '—' : implode(', ', $state)),
                ])
                ->columns(2),
            Section::make('Lifecycle')
                ->schema([
                    TextEntry::make('created_at')->label('Created')->dateTime(),
                    TextEntry::make('updated_at')->label('Updated')->dateTime(),
                    TextEntry::make('archived_at')->label('Archived')->dateTime()->placeholder('Active'),
                ])
                ->columns(3),
        ]);
    }

    protected function getHeaderActions(): array
    {
        return [
            HabitResource::archiveAction(),
            HabitResource::restoreAction(),
            HabitResource::deleteAction(),
        ];
    }
}
