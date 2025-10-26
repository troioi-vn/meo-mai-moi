<?php

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use Filament\Actions;
use Filament\Infolists\Components\ImageEntry;
use Filament\Infolists\Components\Section;
use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Infolist;
use Filament\Resources\Pages\ViewRecord;

/**
 * @property \App\Models\User $record
 */
class ViewUser extends ViewRecord
{
    protected static string $resource = UserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('upload_avatar')
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

                    // Refresh the page to show the new avatar
                    return redirect()->to(request()->header('Referer'));
                }),

            Actions\Action::make('delete_avatar')
                ->label('Delete Avatar')
                ->icon('heroicon-o-trash')
                ->color('danger')
                ->requiresConfirmation()
                ->visible(fn () => $this->record->getMedia('avatar')->count() > 0)
                ->action(function () {
                    $this->record->clearMediaCollection('avatar');

                    // Refresh the page to show the change
                    $this->redirect(request()->header('Referer'));
                }),

            Actions\EditAction::make(),
        ];
    }

    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Section::make('User Information')
                    ->schema([
                        ImageEntry::make('avatar_url')
                            ->label('Avatar')
                            ->height(150)
                            ->width(150)
                            ->circular()
                            ->columnSpan(1),

                        Section::make()
                            ->schema([
                                TextEntry::make('name')
                                    ->size('lg')
                                    ->weight('bold'),
                                TextEntry::make('email')
                                    ->icon('heroicon-m-envelope'),
                                TextEntry::make('email_verified_at')
                                    ->label('Email Verified')
                                    ->badge()
                                    ->color(fn ($state) => $state ? 'success' : 'danger')
                                    ->formatStateUsing(fn ($state) => $state ? 'Verified' : 'Not Verified'),
                                TextEntry::make('roles.name')
                                    ->label('Roles')
                                    ->badge()
                                    ->separator(',')
                                    ->visible(fn ($record) => $record->roles->isNotEmpty()),
                                TextEntry::make('created_at')
                                    ->label('Member Since')
                                    ->date(),
                            ])
                            ->columnSpan(2),
                    ])
                    ->columns(3),

                Section::make('Statistics')
                    ->schema([
                        TextEntry::make('pets_count')
                            ->label('Total Pets')
                            ->state(fn ($record) => $record->pets()->count()),
                        TextEntry::make('active_pets_count')
                            ->label('Active Pets')
                            ->state(fn ($record) => $record->pets()->where('status', 'active')->count()),
                    ])
                    ->columns(2)
                    ->collapsible(),
            ]);
    }
}
