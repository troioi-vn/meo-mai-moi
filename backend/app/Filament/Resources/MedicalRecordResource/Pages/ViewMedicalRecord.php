<?php

declare(strict_types=1);

namespace App\Filament\Resources\MedicalRecordResource\Pages;

use App\Filament\Resources\MedicalRecordResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewMedicalRecord extends ViewRecord
{
    protected static string $resource = MedicalRecordResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make(),
            Actions\DeleteAction::make(),
        ];
    }
}
