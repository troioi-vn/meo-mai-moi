<?php

declare(strict_types=1);

namespace App\Filament\Resources\PetMicrochipResource\Pages;

use App\Filament\Resources\PetMicrochipResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditPetMicrochip extends EditRecord
{
    protected static string $resource = PetMicrochipResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\ViewAction::make(),
            Actions\DeleteAction::make(),
        ];
    }
}
