<?php

declare(strict_types=1);

namespace App\Filament\Resources\TransferRequestResource\Pages;

use App\Filament\Resources\TransferRequestResource;
use Filament\Resources\Pages\CreateRecord;

class CreateTransferRequest extends CreateRecord
{
    protected static string $resource = TransferRequestResource::class;
}
