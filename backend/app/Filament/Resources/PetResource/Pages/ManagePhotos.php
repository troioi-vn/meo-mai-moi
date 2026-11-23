<?php

declare(strict_types=1);

namespace App\Filament\Resources\PetResource\Pages;

use App\Filament\Resources\PetResource;
use App\Models\Pet;
use Filament\Actions;
use Filament\Forms\Components\FileUpload;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ManageRelatedRecords;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Storage;

class ManagePhotos extends ManageRelatedRecords
{
    protected static string $resource = PetResource::class;

    protected static string $relationship = 'media';

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-photo';

    public function getTitle(): string
    {
        return "Manage {$this->getOwnerRecord()->name}'s Photos";
    }

    public static function getNavigationLabel(): string
    {
        return 'Photos';
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('name')
            ->columns([
                Tables\Columns\ImageColumn::make('url')
                    ->label('Photo')
                    ->height(100)
                    ->width(100),
                Tables\Columns\TextColumn::make('name')
                    ->label('Filename')
                    ->searchable(),
                Tables\Columns\TextColumn::make('human_readable_size')
                    ->label('Size'),
                Tables\Columns\TextColumn::make('mime_type')
                    ->label('Type'),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Uploaded')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
            ])
            ->headerActions([
            ])
            ->actions([
                Actions\ViewAction::make()
                    ->url(fn ($record) => $record->getUrl()),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->modifyQueryUsing(fn ($query) => $query->where('collection_name', 'photos'));
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('upload_photo')
                ->label('Upload Photo')
                ->icon('heroicon-o-plus')
                ->form([
                    FileUpload::make('photo')
                        // A temp file on the local disk, handed to the media library below,
                        // which stores it on the media disk (S3 or local).
                        ->disk('local')
                        ->label('Photo')
                        ->image()
                        ->imageEditor()
                        ->imageEditorAspectRatios(['4:3', '16:9', '1:1'])
                        ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/jpg', 'image/gif'])
                        ->maxSize(10240)
                        ->required(),
                ])
                ->action(function (array $data): void {
                    /** @var Pet $pet */
                    $pet = $this->getOwnerRecord();

                    // Get the uploaded file path
                    $filePath = Storage::disk('local')->path($data['photo']);

                    // Add new photo from uploaded file
                    if (file_exists($filePath)) {
                        $pet->addMedia($filePath)
                            ->toMediaCollection('photos');

                        Notification::make()
                            ->title('Photo uploaded successfully')
                            ->success()
                            ->send();
                    } else {
                        Notification::make()
                            ->title('Failed to upload photo')
                            ->danger()
                            ->send();
                    }
                }),
        ];
    }
}
