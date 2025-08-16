<?php

namespace App\Filament\Resources\HelperProfileResource\Pages;

use App\Filament\Resources\HelperProfileResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListHelperProfiles extends ListRecords
{
    protected static string $resource = HelperProfileResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}