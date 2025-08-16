<?php

namespace App\Filament\Resources\PlacementRequestResource\Pages;

use App\Filament\Resources\PlacementRequestResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListPlacementRequests extends ListRecords
{
    protected static string $resource = PlacementRequestResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}