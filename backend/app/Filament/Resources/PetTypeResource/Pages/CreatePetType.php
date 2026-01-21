<?php

declare(strict_types=1);

namespace App\Filament\Resources\PetTypeResource\Pages;

use App\Filament\Resources\PetTypeResource;
use Filament\Resources\Pages\CreateRecord;

class CreatePetType extends CreateRecord
{
    protected static string $resource = PetTypeResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}
