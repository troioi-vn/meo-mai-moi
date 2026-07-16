<?php

declare(strict_types=1);

namespace App\Filament\Resources\ResourceInvitationResource\Pages;

use App\Filament\Resources\ResourceInvitationResource;
use Filament\Resources\Pages\ListRecords;

class ListResourceInvitations extends ListRecords
{
    protected static string $resource = ResourceInvitationResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}
