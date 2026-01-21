<?php

declare(strict_types=1);

namespace App\Filament\Resources\ChatMessageResource\Pages;

use App\Filament\Resources\ChatMessageResource;
use Filament\Resources\Pages\ListRecords;

class ListChatMessages extends ListRecords
{
    protected static string $resource = ChatMessageResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}
