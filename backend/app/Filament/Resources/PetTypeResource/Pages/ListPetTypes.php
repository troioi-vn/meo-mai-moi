<?php

declare(strict_types=1);

namespace App\Filament\Resources\PetTypeResource\Pages;

use App\Filament\Resources\PetTypeResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;
use LaraZeus\SpatieTranslatable\Actions\LocaleSwitcher;
use LaraZeus\SpatieTranslatable\Resources\Pages\ListRecords\Concerns\Translatable;

class ListPetTypes extends ListRecords
{
    use Translatable;

    protected static string $resource = PetTypeResource::class;

    protected function getHeaderActions(): array
    {
        return [
            LocaleSwitcher::make(),
            Actions\CreateAction::make(),
        ];
    }
}
