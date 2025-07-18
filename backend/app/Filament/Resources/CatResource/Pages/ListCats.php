<?php

namespace App\Filament\Resources\CatResource\Pages;

use App\Filament\Resources\CatResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListCats extends ListRecords
{
    protected static string $resource = CatResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
