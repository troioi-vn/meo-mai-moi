<?php

declare(strict_types=1);

namespace App\Filament\Resources\TransferRequestResource\Pages;

use App\Filament\Resources\TransferRequestResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditTransferRequest extends EditRecord
{
    protected static string $resource = TransferRequestResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\ViewAction::make(),
            Actions\DeleteAction::make(),
        ];
    }
}
