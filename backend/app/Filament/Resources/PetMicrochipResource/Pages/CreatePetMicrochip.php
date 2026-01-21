<?php

declare(strict_types=1);

namespace App\Filament\Resources\PetMicrochipResource\Pages;

use App\Filament\Resources\PetMicrochipResource;
use Filament\Resources\Pages\CreateRecord;

class CreatePetMicrochip extends CreateRecord
{
    protected static string $resource = PetMicrochipResource::class;
}
