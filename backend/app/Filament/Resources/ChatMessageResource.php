<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Enums\ChatMessageType;
use App\Filament\Resources\ChatMessageResource\Pages;
use App\Models\ChatMessage;
use App\Services\ChatMessageModerationService;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class ChatMessageResource extends Resource
{
    protected static ?string $model = ChatMessage::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-chat-bubble-bottom-center-text';

    protected static string|\UnitEnum|null $navigationGroup = 'Communication';

    protected static ?int $navigationSort = 2;

    protected static ?string $navigationLabel = 'Chat Messages';

    protected static bool $shouldRegisterNavigation = true;

    protected static ?string $modelLabel = 'Chat Message';

    public static function form(Schema $form): Schema
    {
        return $form
            ->schema([
                Section::make('Message Details')
                    ->schema([
                        Forms\Components\Select::make('chat_id')
                            ->label('Chat')
                            ->relationship('chat', 'id')
                            ->required(),

                        Forms\Components\Select::make('sender_id')
                            ->label('Sender')
                            ->relationship('sender', 'name')
                            ->required(),

                        Forms\Components\Select::make('type')
                            ->label('Message Type')
                            ->options(ChatMessageType::class)
                            ->default(ChatMessageType::TEXT->value)
                            ->required(),

                        Forms\Components\Textarea::make('content')
                            ->label('Content')
                            ->required()
                            ->columnSpanFull()
                            ->rows(4),
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

                Tables\Columns\TextColumn::make('chat_id')
                    ->label('Chat ID')
                    ->sortable(),

                Tables\Columns\TextColumn::make('sender.name')
                    ->label('Sender')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('type')
                    ->label('Type')
                    ->badge(),

                Tables\Columns\TextColumn::make('content')
                    ->label('Content')
                    ->limit(50)
                    ->tooltip(function (Tables\Columns\TextColumn $column): ?string {
                        $state = $column->getState();
                        if (strlen($state) <= 50) {
                            return null;
                        }

                        return $state;
                    })
                    ->searchable(),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Sent At')
                    ->dateTime()
                    ->sortable(),

                Tables\Columns\IconColumn::make('deleted_at')
                    ->label('Deleted')
                    ->boolean()
                    ->getStateUsing(fn ($record) => $record->deleted_at !== null)
                    ->trueIcon('heroicon-o-trash')
                    ->falseIcon('heroicon-o-check-circle')
                    ->trueColor('danger')
                    ->falseColor('success'),
            ])
            ->filters([
                Tables\Filters\TrashedFilter::make(),
            ])
            ->actions([
                Actions\ViewAction::make(),
                Actions\Action::make('soft_delete')
                    ->label('Delete')
                    ->icon('heroicon-o-trash')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->visible(fn (ChatMessage $record): bool => ! $record->trashed())
                    ->action(fn (ChatMessage $record) => app(ChatMessageModerationService::class)->softDelete($record)),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [

        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListChatMessages::route('/'),
            'view' => Pages\ViewChatMessage::route('/{record}'),
        ];
    }

    /**
     * Moderators must be able to inspect deleted message content and metadata.
     */
    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withoutGlobalScopes([SoftDeletingScope::class]);
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit(Model $record): bool
    {
        return false;
    }

    public static function canForceDelete(Model $record): bool
    {
        return false;
    }

    public static function canRestore(Model $record): bool
    {
        return false;
    }
}
