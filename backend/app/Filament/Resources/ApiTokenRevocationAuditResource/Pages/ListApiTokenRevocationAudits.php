<?php

declare(strict_types=1);

namespace App\Filament\Resources\ApiTokenRevocationAuditResource\Pages;

use App\Filament\Resources\ApiTokenRevocationAuditResource;
use Filament\Resources\Pages\ListRecords;

class ListApiTokenRevocationAudits extends ListRecords
{
    protected static string $resource = ApiTokenRevocationAuditResource::class;
}
