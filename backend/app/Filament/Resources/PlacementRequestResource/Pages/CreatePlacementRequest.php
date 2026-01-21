<?php

declare(strict_types=1);

namespace App\Filament\Resources\PlacementRequestResource\Pages;

use App\Filament\Resources\PlacementRequestResource;
use Filament\Resources\Pages\CreateRecord;

class CreatePlacementRequest extends CreateRecord
{
    protected static string $resource = PlacementRequestResource::class;
}
