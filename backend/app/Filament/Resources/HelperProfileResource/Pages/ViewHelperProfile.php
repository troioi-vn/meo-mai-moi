<?php

declare(strict_types=1);

namespace App\Filament\Resources\HelperProfileResource\Pages;

use App\Filament\Resources\HelperProfileResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewHelperProfile extends ViewRecord
{
    protected static string $resource = HelperProfileResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('manage_photos')
                ->label('Manage Photos')
                ->icon('heroicon-o-photo')
                ->url(fn (): string => static::getResource()::getUrl('photos', ['record' => $this->record])),
            Actions\EditAction::make(),
        ];
    }
}
