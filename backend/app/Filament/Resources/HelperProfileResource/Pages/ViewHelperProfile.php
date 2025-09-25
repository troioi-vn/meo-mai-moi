<?php

namespace App\Filament\Resources\HelperProfileResource\Pages;

use App\Filament\Resources\HelperProfileResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewHelperProfile extends ViewRecord
{
    protected static string $resource = HelperProfileResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make(),
        ];
    }
}
