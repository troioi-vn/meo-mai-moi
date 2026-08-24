<?php

declare(strict_types=1);

namespace App\Filament\Resources\LitterResource\Pages;

use App\Filament\Resources\LitterResource;
use Filament\Resources\Pages\ListRecords;

class ListLitters extends ListRecords
{
    protected static string $resource = LitterResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}
