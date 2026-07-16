<?php

declare(strict_types=1);

namespace App\Filament\Resources\ContentTranslationResource\Pages;

use App\Filament\Resources\ContentTranslationResource;
use Filament\Resources\Pages\ListRecords;

class ListContentTranslations extends ListRecords
{
    protected static string $resource = ContentTranslationResource::class;
}
