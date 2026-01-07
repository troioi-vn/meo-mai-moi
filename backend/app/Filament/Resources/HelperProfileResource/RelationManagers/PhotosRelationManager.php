<?php

namespace App\Filament\Resources\HelperProfileResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;

class PhotosRelationManager extends RelationManager
{
    protected static string $relationship = 'photos';

    protected static ?string $recordTitleAttribute = 'path';

    protected static ?string $title = 'Profile Photos';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\FileUpload::make('path')
                    ->label('Photo')
                    ->image()
                    ->imageEditor()
                    ->imageEditorAspectRatios([
                        '1:1',
                        '4:3',
                        '16:9',
                    ])
                    ->directory('helper-profile-photos')
                    ->visibility('public')
                    ->required()
                    ->columnSpanFull(),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('path')
            ->columns([
                Tables\Columns\ImageColumn::make('path')
                    ->label('Photo')
                    ->square()
                    ->size(80),

                Tables\Columns\TextColumn::make('path')
                    ->label('File Path')
                    ->searchable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Uploaded')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(),
            ])
            ->filters([
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make()
                    ->label('Add Photo'),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make()
                    ->requiresConfirmation(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make()
                        ->requiresConfirmation(),
                ]),
            ])
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading('No photos uploaded')
            ->emptyStateDescription('Upload photos to showcase this helper profile.')
            ->emptyStateIcon('heroicon-o-photo');
    }
}
