<?php

declare(strict_types=1);

namespace App\Filament\Resources\PlacementRequestResource\Pages;

use App\Filament\Resources\PlacementRequestResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewPlacementRequest extends ViewRecord
{
    protected static string $resource = PlacementRequestResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make(),
        ];
    }
}
