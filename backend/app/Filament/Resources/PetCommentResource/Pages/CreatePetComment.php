<?php

declare(strict_types=1);

namespace App\Filament\Resources\PetCommentResource\Pages;

use App\Filament\Resources\PetCommentResource;
use Filament\Resources\Pages\CreateRecord;

class CreatePetComment extends CreateRecord
{
    protected static string $resource = PetCommentResource::class;
}
