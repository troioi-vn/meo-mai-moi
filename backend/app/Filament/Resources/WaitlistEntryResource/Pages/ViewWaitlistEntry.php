<?php

namespace App\Filament\Resources\WaitlistEntryResource\Pages;

use App\Filament\Resources\WaitlistEntryResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewWaitlistEntry extends ViewRecord
{
    protected static string $resource = WaitlistEntryResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make(),
        ];
    }
}