<?php

declare(strict_types=1);

namespace App\Filament\Resources\PetResource\Pages;

use App\Filament\Resources\PetResource;
use Filament\Actions;
use Filament\Resources\Pages\ManageRelatedRecords;
use Filament\Tables;
use Filament\Tables\Table;

class ManagePhotos extends ManageRelatedRecords
{
    protected static string $resource = PetResource::class;

    protected static string $relationship = 'media';

    protected static ?string $navigationIcon = 'heroicon-o-photo';

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
                Tables\Actions\ViewAction::make()
                    ->url(fn ($record) => $record->getUrl()),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
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
                    \Filament\Forms\Components\FileUpload::make('photo')
                        ->label('Photo')
                        ->image()
                        ->imageEditor()
                        ->imageEditorAspectRatios(['4:3', '16:9', '1:1'])
                        ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/jpg', 'image/gif'])
                        ->maxSize(10240)
                        ->required(),
                ])
                ->action(function (array $data): void {
                    /** @var \App\Models\Pet $pet */
                    $pet = $this->getOwnerRecord();

                    // Get the uploaded file path
                    $filePath = storage_path('app/public/'.$data['photo']);

                    // Add new photo from uploaded file
                    if (file_exists($filePath)) {
                        $pet->addMedia($filePath)
                            ->toMediaCollection('photos');

                        \Filament\Notifications\Notification::make()
                            ->title('Photo uploaded successfully')
                            ->success()
                            ->send();
                    } else {
                        \Filament\Notifications\Notification::make()
                            ->title('Failed to upload photo')
                            ->danger()
                            ->send();
                    }
                }),
        ];
    }
}
