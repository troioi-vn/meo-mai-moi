<?php

namespace App\Filament\Resources\HelperProfileResource\Pages;

use App\Filament\Resources\HelperProfileResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditHelperProfile extends EditRecord
{
    protected static string $resource = HelperProfileResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\ViewAction::make(),
            Actions\DeleteAction::make(),
        ];
    }
}
