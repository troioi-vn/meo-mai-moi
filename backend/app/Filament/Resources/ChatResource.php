<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ChatResource\Pages;
use App\Models\Chat;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class ChatResource extends Resource
{
    protected static ?string $model = Chat::class;

    protected static ?string $navigationIcon = 'heroicon-o-chat-bubble-left-right';

    protected static ?string $navigationGroup = 'Communication';

    protected static ?int $navigationSort = 2;

    protected static ?string $recordTitleAttribute = 'id';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Chat Details')
                    ->schema([
                        Forms\Components\Select::make('type')
                            ->label('Chat Type')
                            ->options([
                                'direct' => 'Direct Message',
                                'private_group' => 'Private Group',
                                'public_group' => 'Public Group',
                            ])
                            ->required(),

                        Forms\Components\Select::make('contextable_type')
                            ->label('Context Type')
                            ->options([
                                'PlacementRequest' => 'Placement Request',
                                'Pet' => 'Pet',
                            ])
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

                Tables\Columns\BadgeColumn::make('type')
                    ->label('Type')
                    ->colors([
                        'primary' => 'direct',
                        'success' => 'private_group',
                        'warning' => 'public_group',
                    ]),

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
                    ->label('Context')
                    ->formatStateUsing(fn ($state) => $state?->getLabel() ?? '-'),

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
                    ->options([
                        'direct' => 'Direct Message',
                        'private_group' => 'Private Group',
                        'public_group' => 'Public Group',
                    ]),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
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
