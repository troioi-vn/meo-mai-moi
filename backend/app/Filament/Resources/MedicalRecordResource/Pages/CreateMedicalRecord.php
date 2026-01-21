<?php

declare(strict_types=1);

namespace App\Filament\Resources\MedicalRecordResource\Pages;

use App\Filament\Resources\MedicalRecordResource;
use Filament\Resources\Pages\CreateRecord;

class CreateMedicalRecord extends CreateRecord
{
    protected static string $resource = MedicalRecordResource::class;
}
