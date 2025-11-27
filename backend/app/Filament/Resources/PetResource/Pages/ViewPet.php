<?php

namespace App\Filament\Resources\PetResource\Pages;

use App\Enums\PetStatus;
use App\Filament\Resources\PetResource;
use Filament\Actions;
use Filament\Infolists\Components\ImageEntry;
use Filament\Infolists\Components\Section;
use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Infolist;
use Filament\Resources\Pages\ViewRecord;

/**
 * @property \App\Models\Pet $record
 */
class ViewPet extends ViewRecord
{
    protected static string $resource = PetResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('upload_photo')
                ->label('Upload Photo')
                ->icon('heroicon-o-camera')
                ->form([
                    \Filament\Forms\Components\FileUpload::make('photo')
                        ->label('Photo')
                        ->image()
                        ->imageEditor()
                        ->imageEditorAspectRatios(['4:3', '16:9', '1:1'])
                        ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/jpg', 'image/gif'])
                        ->maxSize(10240)
                        ->required(),
                ])
                ->action(function (array $data) {
                    $pet = $this->record;

                    // Get the uploaded file path
                    $filePath = storage_path('app/public/'.$data['photo']);

                    // Add new photo from uploaded file
                    if (file_exists($filePath)) {
                        $pet->addMedia($filePath)
                            ->toMediaCollection('photos');
                    }

                    // Refresh the page to show the new photo
                    $this->redirect(request()->header('Referer'));
                }),

            Actions\Action::make('manage_photos')
                ->label('Manage Photos')
                ->icon('heroicon-o-photo')
                ->visible(fn () => $this->record->getMedia('photos')->count() > 0)
                ->url(fn () => static::getResource()::getUrl('photos', ['record' => $this->record])),

            Actions\EditAction::make(),
        ];
    }

    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Section::make('Pet Information')
                    ->schema([
                        ImageEntry::make('photo_url')
                            ->label('Photo')
                            ->height(200)
                            ->width(200)
                            ->extraAttributes(['class' => 'rounded-lg'])
                            ->columnSpan(1),

                        Section::make()
                            ->schema([
                                TextEntry::make('name')
                                    ->size('lg')
                                    ->weight('bold'),
                                TextEntry::make('petType.name')
                                    ->label('Type')
                                    ->badge(),
                                TextEntry::make('breed'),
                                TextEntry::make('birthday')
                                    ->date()
                                    ->formatStateUsing(function ($state) {
                                        if (! $state) {
                                            return '-';
                                        }
                                        $age = now()->diffInYears($state);

                                        return $state->format('M j, Y')." ({$age}y)";
                                    }),
                                TextEntry::make('location'),
                                TextEntry::make('status')
                                    ->badge()
                                    ->color(fn (PetStatus $state): string => match ($state) {
                                        PetStatus::ACTIVE => 'success',
                                        PetStatus::LOST => 'warning',
                                        PetStatus::DECEASED => 'primary',
                                        PetStatus::DELETED => 'danger',
                                    }),
                                TextEntry::make('user.name')
                                    ->label('Owner'),
                            ])
                            ->columnSpan(2),
                    ])
                    ->columns(3),

                Section::make('Description')
                    ->schema([
                        TextEntry::make('description')
                            ->prose()
                            ->hiddenLabel(),
                    ])
                    ->collapsible()
                    ->visible(fn ($record) => ! empty($record->description)),
            ]);
    }
}
