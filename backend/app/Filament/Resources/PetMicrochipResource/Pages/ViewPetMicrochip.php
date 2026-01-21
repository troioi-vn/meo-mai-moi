<?php

declare(strict_types=1);

namespace App\Filament\Resources\PetMicrochipResource\Pages;

use App\Filament\Resources\PetMicrochipResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewPetMicrochip extends ViewRecord
{
    protected static string $resource = PetMicrochipResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make(),
            Actions\DeleteAction::make(),
        ];
    }
}
