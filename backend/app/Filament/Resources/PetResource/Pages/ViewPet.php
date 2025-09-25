<?php

namespace App\Filament\Resources\PetResource\Pages;

use App\Filament\Resources\PetResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewPet extends ViewRecord
{
    protected static string $resource = PetResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make(),
        ];
    }
}
