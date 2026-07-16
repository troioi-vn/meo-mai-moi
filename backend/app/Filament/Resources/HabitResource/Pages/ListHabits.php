<?php

declare(strict_types=1);

namespace App\Filament\Resources\HabitResource\Pages;

use App\Filament\Resources\HabitResource;
use Filament\Resources\Pages\ListRecords;

class ListHabits extends ListRecords
{
    protected static string $resource = HabitResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}
