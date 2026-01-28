<?php

declare(strict_types=1);

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use App\Models\User;
use Filament\Actions;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;
use STS\FilamentImpersonate\Pages\Actions\Impersonate;

class EditUser extends EditRecord
{
    protected static string $resource = UserResource::class;

    public function mutateFormDataBeforeSave(array $data): array
    {
        $getUser = User::where('email', $data['email'])->first();
        if ($getUser) {
            if (empty($data['password'])) {
                $data['password'] = $getUser->password;
            }
        }

        return $data;
    }

    public function getTitle(): string
    {
        return trans('filament-users::user.resource.title.edit');
    }

    protected function getHeaderActions(): array
    {
        $ret = [];

        if (config('filament-users.impersonate')) {
            $ret[] = Impersonate::make()
                ->redirectTo('/')
                ->record($this->getRecord());
        }

        $ret[] = Actions\Action::make('upload_avatar')
            ->label('Upload Avatar')
            ->icon('heroicon-o-camera')
            ->form([
                \Filament\Forms\Components\FileUpload::make('avatar')
                    ->label('Avatar')
                    ->image()
                    ->imageEditor()
                    ->imageEditorAspectRatios(['1:1'])
                    ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/jpg', 'image/gif'])
                    ->maxSize(10240)
                    ->required(),
            ])
            ->action(function (array $data) {
                /** @var User $user */
                $user = $this->record;

                // Clear existing avatar
                $user->clearMediaCollection('avatar');

                // Handle the uploaded file - Filament stores it in storage/app/public
                $uploadedFile = $data['avatar'];
                if ($uploadedFile) {
                    // Get the full path to the uploaded file
                    $filePath = storage_path('app/public/'.$uploadedFile);

                    if (file_exists($filePath)) {
                        // Add the file to MediaLibrary
                        $user->addMedia($filePath)
                            ->toMediaCollection('avatar');

                        // Clean up the temporary file after MediaLibrary has processed it
                        @unlink($filePath);

                        \Filament\Notifications\Notification::make()
                            ->title('Avatar updated successfully')
                            ->success()
                            ->send();
                    } else {
                        \Filament\Notifications\Notification::make()
                            ->title('Failed to upload avatar - file not found')
                            ->danger()
                            ->send();
                    }
                }

                // Refresh the page
                return redirect()->to(request()->header('Referer'));
            });

        $ret[] = Actions\Action::make('delete_avatar')
            ->label('Delete Avatar')
            ->icon('heroicon-o-trash')
            ->color('danger')
            ->requiresConfirmation()
            ->visible(fn (\App\Models\User $record) => $record->getFirstMedia('avatar') !== null)
            ->action(function (\App\Models\User $record): void {
                $this->record->clearMediaCollection('avatar');

                \Filament\Notifications\Notification::make()
                    ->title('Avatar deleted successfully')
                    ->success()
                    ->send();

                $this->redirect(request()->header('Referer'));
            });

        $ret[] = DeleteAction::make();

        return $ret;
    }
}
