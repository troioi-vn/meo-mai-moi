<?php

declare(strict_types=1);

namespace App\Filament\Resources\CategoryResource\Pages;

use App\Filament\Resources\CategoryResource;
use App\Models\Category;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

/**
 * @property Category $record
 */
class EditCategory extends EditRecord
{
    use EditRecord\Concerns\Translatable;

    protected static string $resource = CategoryResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\LocaleSwitcher::make(),
            Actions\ViewAction::make(),
            Actions\DeleteAction::make(),
        ];
    }

    protected function mutateFormDataBeforeSave(array $data): array
    {
        // Handle the is_approved toggle
        if (isset($data['is_approved'])) {
            if ($data['is_approved'] && ! $this->record->approved_at) {
                $data['approved_at'] = now();
            } elseif (! $data['is_approved'] && $this->record->approved_at) {
                $data['approved_at'] = null;
            }
            unset($data['is_approved']);
        }

        return $data;
    }
}
