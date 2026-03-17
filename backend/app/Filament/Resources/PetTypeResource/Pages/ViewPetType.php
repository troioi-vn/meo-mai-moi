<?php

declare(strict_types=1);

namespace App\Filament\Resources\PetTypeResource\Pages;

use App\Filament\Resources\PetTypeResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;
use LaraZeus\SpatieTranslatable\Actions\LocaleSwitcher;
use LaraZeus\SpatieTranslatable\Resources\Pages\ViewRecord\Concerns\Translatable;

class ViewPetType extends ViewRecord
{
    use Translatable;

    protected static string $resource = PetTypeResource::class;

    protected function getHeaderActions(): array
    {
        return [
            LocaleSwitcher::make(),
            Actions\EditAction::make(),
        ];
    }
}
