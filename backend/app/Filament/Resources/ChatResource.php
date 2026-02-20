<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Enums\ChatType;
use App\Enums\ContextableType;
use App\Filament\Resources\ChatResource\Pages;
use App\Models\Chat;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

class ChatResource extends Resource
{
    protected static ?string $model = Chat::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-chat-bubble-left-right';

    protected static string|\UnitEnum|null $navigationGroup = 'Management';

    protected static ?int $navigationSort = 3;

    protected static ?string $recordTitleAttribute = 'id';

    public static function form(Schema $form): Schema
    {
        return $form
            ->schema([
                \Filament\Schemas\Components\Section::make('Chat Details')
                    ->schema([
                        Forms\Components\Select::make('type')
                            ->label('Chat Type')
                            ->options(ChatType::class)
                            ->required(),

                        Forms\Components\Select::make('contextable_type')
                            ->label('Context Type')
                            ->options(ContextableType::class)
                            ->nullable(),

                        Forms\Components\TextInput::make('contextable_id')
                            ->label('Context ID')
                            ->numeric()
                            ->nullable(),
                    ])
                    ->columns(3),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->label('ID')
                    ->sortable(),

                Tables\Columns\TextColumn::make('type')
                    ->label('Type')
                    ->badge(),

                Tables\Columns\TextColumn::make('activeParticipants.name')
                    ->label('Participants')
                    ->listWithLineBreaks()
                    ->limitList(3)
                    ->expandableLimitedList(),

                Tables\Columns\TextColumn::make('messages_count')
                    ->label('Messages')
                    ->counts('messages')
                    ->sortable(),

                Tables\Columns\TextColumn::make('contextable_type')
                    ->label('Context'),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable(),

                Tables\Columns\TextColumn::make('updated_at')
                    ->label('Last Activity')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('type')
                    ->options(ChatType::class),

                Tables\Filters\SelectFilter::make('contextable_type')
                    ->options(ContextableType::class),
            ])
            ->actions([
                Actions\ViewAction::make(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('updated_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [

        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListChats::route('/'),
            'view' => Pages\ViewChat::route('/{record}'),
        ];
    }
}
