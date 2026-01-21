<?php

declare(strict_types=1);

namespace App\Filament\Resources\ChatMessageResource\Pages;

use App\Filament\Resources\ChatMessageResource;
use Filament\Resources\Pages\ViewRecord;

class ViewChatMessage extends ViewRecord
{
    protected static string $resource = ChatMessageResource::class;
}
