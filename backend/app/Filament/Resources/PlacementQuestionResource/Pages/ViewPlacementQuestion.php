<?php

declare(strict_types=1);

namespace App\Filament\Resources\PlacementQuestionResource\Pages;

use App\Filament\Resources\PlacementQuestionResource;
use Filament\Resources\Pages\ViewRecord;

class ViewPlacementQuestion extends ViewRecord
{
    protected static string $resource = PlacementQuestionResource::class;

    /**
     * @return array<int, mixed>
     */
    protected function getHeaderActions(): array
    {
        return [
            PlacementQuestionResource::approveAction(),
            PlacementQuestionResource::hideAction(),
            PlacementQuestionResource::unhideAction(),
        ];
    }
}
