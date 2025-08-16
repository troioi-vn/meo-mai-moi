<?php

namespace App\Filament\Resources\FosterAssignmentResource\Pages;

use App\Filament\Resources\FosterAssignmentResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditFosterAssignment extends EditRecord
{
    protected static string $resource = FosterAssignmentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\ViewAction::make(),
            Actions\DeleteAction::make(),
        ];
    }
}