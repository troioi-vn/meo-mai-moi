<?php

namespace App\Filament\Resources\PetTypeResource\Pages;

use App\Enums\PetTypeStatus;
use App\Filament\Resources\PetTypeResource;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;

class EditPetType extends EditRecord
{
    protected static string $resource = PetTypeResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\ViewAction::make(),
            Actions\DeleteAction::make()
                ->before(function ($record) {
                    // Check if it's a system type
                    if ($record->is_system) {
                        Notification::make()
                            ->title('Cannot delete system pet type')
                            ->body('System pet types (Cat, Dog) cannot be deleted.')
                            ->danger()
                            ->send();

                        return false; // Cancel the action
                    }

                    // Check if it has pets
                    if ($record->pets()->count() > 0) {
                        Notification::make()
                            ->title('Cannot delete pet type with pets')
                            ->body('This pet type has pets associated with it and cannot be deleted.')
                            ->danger()
                            ->send();

                        return false; // Cancel the action
                    }
                }),
        ];
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function mutateFormDataBeforeSave(array $data): array
    {
        // Prevent changing system status or deactivating Cat
        if ($this->record instanceof \App\Models\PetType && $this->record->slug === 'cat') {
            $data['status'] = PetTypeStatus::ACTIVE->value; // Force Cat to remain active
            $data['is_system'] = true; // Force Cat to remain system
        }

        return $data;
    }
}
