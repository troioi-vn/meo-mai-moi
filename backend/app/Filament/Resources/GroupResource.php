<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\GroupResource\Pages;
use App\Filament\Resources\GroupResource\RelationManagers;
use App\Models\Group;
use App\Services\Groups\GroupService;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;

class GroupResource extends Resource
{
    protected static ?string $model = Group::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-user-group';

    protected static string|\UnitEnum|null $navigationGroup = 'User features';

    protected static ?int $navigationSort = 7;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->sortable(),
                Tables\Columns\TextColumn::make('name')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('active_memberships_count')
                    ->label('Members')->counts('activeMemberships')->sortable(),
                Tables\Columns\TextColumn::make('active_group_pets_count')
                    ->label('Pets')->counts('activeGroupPets')->sortable(),
                Tables\Columns\TextColumn::make('ledgers_count')
                    ->label('Ledgers')->counts('ledgers')->sortable(),
                Tables\Columns\TextColumn::make('creator.name')->label('Created by')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('created_at')->dateTime()->sortable(),
            ])
            ->filters([
                Tables\Filters\Filter::make('has_pets')
                    ->query(fn ($query) => $query->whereHas('activeGroupPets')),
                Tables\Filters\Filter::make('has_ledgers')
                    ->query(fn ($query) => $query->whereHas('ledgers')),
            ])
            ->actions([
                Actions\ViewAction::make(),
                Actions\Action::make('delete_group')
                    ->label('Delete')
                    ->icon('heroicon-o-trash')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalDescription('This ends active memberships and pet assignments, revokes pending invitations, and unlinks synchronized ledgers.')
                    ->action(function (Group $record): void {
                        app(GroupService::class)->deleteAsModerator($record);
                        Notification::make()->title('Group deleted')->success()->send();
                    }),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\MembershipsRelationManager::class,
            RelationManagers\PetsRelationManager::class,
            RelationManagers\LedgersRelationManager::class,
            RelationManagers\InvitationsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListGroups::route('/'),
            'view' => Pages\ViewGroup::route('/{record}'),
        ];
    }

    public static function canAccess(): bool
    {
        return auth()->check() && auth()->user()->hasRole(['admin', 'super_admin']);
    }

    public static function canViewAny(): bool
    {
        return static::canAccess();
    }

    public static function canView(Model $record): bool
    {
        return static::canAccess();
    }
}
