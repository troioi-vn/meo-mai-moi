<?php

declare(strict_types=1);

namespace App\Filament\Resources\ApiTokenResource\Pages;

use App\Filament\Resources\ApiTokenResource;
use Filament\Resources\Pages\ListRecords;

class ListApiTokens extends ListRecords
{
    protected static string $resource = ApiTokenResource::class;
}
