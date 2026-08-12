<?php

declare(strict_types=1);

namespace App\Filament\Resources\ErrorEventResource\Pages;

use App\Filament\Resources\ErrorEventResource;
use Filament\Resources\Pages\ListRecords;

class ListErrorEvents extends ListRecords
{
    protected static string $resource = ErrorEventResource::class;
}
