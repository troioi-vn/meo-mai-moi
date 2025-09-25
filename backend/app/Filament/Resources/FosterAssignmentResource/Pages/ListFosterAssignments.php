<?php

namespace App\Filament\Resources\FosterAssignmentResource\Pages;

use App\Filament\Resources\FosterAssignmentResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListFosterAssignments extends ListRecords
{
    protected static string $resource = FosterAssignmentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
