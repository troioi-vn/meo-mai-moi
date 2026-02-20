<?php

declare(strict_types=1);

namespace App\Filament\Resources\PetTypeResource\Pages;

use App\Filament\Resources\PetTypeResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewPetType extends ViewRecord
{
    use \LaraZeus\SpatieTranslatable\Resources\Pages\ViewRecord\Concerns\Translatable;

    protected static string $resource = PetTypeResource::class;

    protected function getHeaderActions(): array
    {
        return [
            \LaraZeus\SpatieTranslatable\Actions\LocaleSwitcher::make(),
            Actions\EditAction::make(),
        ];
    }
}
