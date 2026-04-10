<?php

declare(strict_types=1);

namespace App\Filament\Resources\HelperProfileResource\Pages;

use App\Filament\Resources\HelperProfileResource;
use App\Models\HelperProfile;
use Filament\Actions;
use Filament\Forms\Components\FileUpload;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ManageRelatedRecords;
use Filament\Tables;
use Filament\Tables\Table;

class ManagePhotos extends ManageRelatedRecords
{
    protected static string $resource = HelperProfileResource::class;

    protected static string $relationship = 'media';

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-photo';

    public function getTitle(): string
    {
        return "Manage {$this->getOwnerRecord()->user->name}'s Photos";
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
                        ->label('Photo')
                        ->image()
                        ->imageEditor()
                        ->imageEditorAspectRatios(['4:3', '16:9', '1:1'])
                        ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/jpg', 'image/gif'])
                        ->maxSize(10240)
                        ->required(),
                ])
                ->action(function (array $data): void {
                    /** @var HelperProfile $helperProfile */
                    $helperProfile = $this->getOwnerRecord();

                    $filePath = storage_path('app/public/'.$data['photo']);

                    if (file_exists($filePath)) {
                        $helperProfile->addMedia($filePath)
                            ->toMediaCollection('photos');

                        Notification::make()
                            ->title('Photo uploaded successfully')
                            ->success()
                            ->send();

                        return;
                    }

                    Notification::make()
                        ->title('Failed to upload photo')
                        ->danger()
                        ->send();
                }),
        ];
    }
}
