<?php

namespace App\Filament\Resources\TransferRequestResource\Pages;

use App\Filament\Resources\TransferRequestResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewTransferRequest extends ViewRecord
{
    protected static string $resource = TransferRequestResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make(),
        ];
    }
}