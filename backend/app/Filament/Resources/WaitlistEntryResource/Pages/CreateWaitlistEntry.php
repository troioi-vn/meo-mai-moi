<?php

namespace App\Filament\Resources\WaitlistEntryResource\Pages;

use App\Filament\Resources\WaitlistEntryResource;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;

class CreateWaitlistEntry extends CreateRecord
{
    protected static string $resource = WaitlistEntryResource::class;
}
