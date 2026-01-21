<?php

declare(strict_types=1);

namespace App\Filament\Resources\PetCommentResource\Pages;

use App\Filament\Resources\PetCommentResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewPetComment extends ViewRecord
{
    protected static string $resource = PetCommentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make(),
            Actions\DeleteAction::make(),
        ];
    }
}
