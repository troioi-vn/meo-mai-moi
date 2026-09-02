<?php

declare(strict_types=1);

namespace App\Filament\Resources\PlacementQuestionResource\Pages;

use App\Filament\Resources\PlacementQuestionResource;
use Filament\Resources\Pages\ListRecords;

class ListPlacementQuestions extends ListRecords
{
    protected static string $resource = PlacementQuestionResource::class;
}
