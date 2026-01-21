<?php

declare(strict_types=1);

namespace App\Filament\Resources\NotificationTemplateResource\Pages;

use App\Filament\Resources\NotificationTemplateResource;
use Filament\Resources\Pages\ListRecords;

class ListNotificationTemplates extends ListRecords
{
    protected static string $resource = NotificationTemplateResource::class;
}
