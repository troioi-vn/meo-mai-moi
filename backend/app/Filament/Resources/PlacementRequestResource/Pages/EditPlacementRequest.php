<?php

namespace App\Filament\Resources\PlacementRequestResource\Pages;

use App\Filament\Resources\PlacementRequestResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditPlacementRequest extends EditRecord
{
    protected static string $resource = PlacementRequestResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\ViewAction::make(),
            Actions\DeleteAction::make(),
        ];
    }
}