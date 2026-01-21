<?php

declare(strict_types=1);

namespace App\Filament\Resources\NotificationResource\Pages;

use App\Filament\Resources\NotificationResource;
use Filament\Resources\Pages\CreateRecord;

class CreateNotification extends CreateRecord
{
    protected static string $resource = NotificationResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        // Set delivered_at to now if not specified
        if (! isset($data['delivered_at'])) {
            $data['delivered_at'] = now();
        }

        return $data;
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}
