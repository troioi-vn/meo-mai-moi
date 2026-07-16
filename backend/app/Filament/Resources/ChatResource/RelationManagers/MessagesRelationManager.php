<?php

declare(strict_types=1);

namespace App\Filament\Resources\ChatResource\RelationManagers;

use App\Filament\Resources\ChatMessageResource;
use App\Models\ChatMessage;
use App\Services\ChatMessageModerationService;
use Filament\Actions;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class MessagesRelationManager extends RelationManager
{
    protected static string $relationship = 'messages';

    public function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query): Builder => $query->withoutGlobalScopes([
                SoftDeletingScope::class,
            ]))
            ->columns([
                Tables\Columns\TextColumn::make('sender.name')
                    ->label('Sender')
                    ->searchable(),
                Tables\Columns\TextColumn::make('type')
                    ->badge(),
                Tables\Columns\TextColumn::make('content')
                    ->wrap()
                    ->searchable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Sent')
                    ->dateTime()
                    ->sortable(),
                Tables\Columns\TextColumn::make('deleted_at')
                    ->label('Deleted')
                    ->dateTime()
                    ->placeholder('No'),
            ])
            ->filters([
                Tables\Filters\TrashedFilter::make(),
            ])
            ->actions([
                Actions\ViewAction::make()
                    ->url(fn (ChatMessage $record): string => ChatMessageResource::getUrl('view', [
                        'record' => $record,
                    ])),
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
}
