<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\PetCommentResource\Pages;
use App\Models\PetComment;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Actions\BulkActionGroup;
use Filament\Tables\Actions\DeleteAction;
use Filament\Tables\Actions\DeleteBulkAction;
use Filament\Tables\Actions\EditAction;
use Filament\Tables\Actions\ViewAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class PetCommentResource extends Resource
{
    protected static ?string $model = PetComment::class;

    protected static ?string $navigationIcon = 'heroicon-o-chat-bubble-left';

    protected static ?string $navigationGroup = 'Pet Management';

    protected static ?int $navigationSort = 5;

    protected static ?string $navigationLabel = 'Pet Comments';

    protected static ?string $modelLabel = 'Pet Comment';

    protected static ?string $pluralModelLabel = 'Pet Comments';

    protected static ?string $recordTitleAttribute = 'comment';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Comment Details')
                    ->schema([
                        Forms\Components\Select::make('pet_id')
                            ->label('Pet')
                            ->relationship('pet', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),

                        Forms\Components\Select::make('user_id')
                            ->label('Author')
                            ->relationship('user', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),

                        Forms\Components\Textarea::make('comment')
                            ->label('Comment')
                            ->required()
                            ->columnSpanFull()
                            ->rows(6)
                            ->helperText('Comment about the pet'),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('pet.name')
                    ->label('Pet')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('user.name')
                    ->label('Author')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('comment')
                    ->label('Comment')
                    ->limit(50)
                    ->tooltip(fn (Tables\Columns\TextColumn $column): ?string => strlen($column->getState()) > 50 ? $column->getState() : null)
                    ->wrap(),

                TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(),

                TextColumn::make('updated_at')
                    ->label('Updated')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('pet_id')
                    ->label('Pet')
                    ->relationship('pet', 'name')
                    ->searchable()
                    ->preload(),

                SelectFilter::make('user_id')
                    ->label('Author')
                    ->relationship('user', 'name')
                    ->searchable()
                    ->preload(),
            ])
            ->actions([
                ViewAction::make(),
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPetComments::route('/'),
            'create' => Pages\CreatePetComment::route('/create'),
            'view' => Pages\ViewPetComment::route('/{record}'),
            'edit' => Pages\EditPetComment::route('/{record}/edit'),
        ];
    }
}
