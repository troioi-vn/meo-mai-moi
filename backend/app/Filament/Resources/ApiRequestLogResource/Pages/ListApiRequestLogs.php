<?php

declare(strict_types=1);

namespace App\Filament\Resources\ApiRequestLogResource\Pages;

use App\Filament\Resources\ApiRequestLogResource;
use Filament\Resources\Pages\ListRecords;

class ListApiRequestLogs extends ListRecords
{
    protected static string $resource = ApiRequestLogResource::class;
}
