<?php

namespace App\Filament\Resources\EmailLogResource\Pages;

use App\Filament\Resources\EmailLogResource;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;

class CreateEmailLog extends CreateRecord
{
    protected static string $resource = EmailLogResource::class;
}
