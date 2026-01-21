<?php

declare(strict_types=1);

namespace App\Filament\Resources\NotificationTemplateResource\Pages;

use App\Filament\Resources\NotificationTemplateResource;
use Filament\Resources\Pages\EditRecord;

class EditNotificationTemplate extends EditRecord
{
    protected static string $resource = NotificationTemplateResource::class;
}
