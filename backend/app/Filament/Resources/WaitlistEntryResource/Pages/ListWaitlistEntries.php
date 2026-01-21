<?php

declare(strict_types=1);

namespace App\Filament\Resources\WaitlistEntryResource\Pages;

use App\Filament\Resources\WaitlistEntryResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListWaitlistEntries extends ListRecords
{
    protected static string $resource = WaitlistEntryResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
