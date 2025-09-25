<?php

namespace App\Filament\Resources\PetResource\Pages;

use App\Filament\Resources\PetResource;
use Filament\Resources\Pages\CreateRecord;

class CreatePet extends CreateRecord
{
    protected static string $resource = PetResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        // Default to Cat pet type if not specified
        if (empty($data['pet_type_id'])) {
            $data['pet_type_id'] = 1; // Cat
        }

        return $data;
    }
}
