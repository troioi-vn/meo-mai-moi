<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Enums\ResourceInvitationStatus;
use App\Enums\ResourceInvitationType;
use App\Filament\Resources\ResourceInvitationResource\Pages;
use App\Models\ResourceInvitation;
use App\Models\User;
use App\Services\ResourceInvitationService;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use RuntimeException;

class ResourceInvitationResource extends Resource
{
    protected static ?string $model = ResourceInvitation::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-share';

    protected static string|\UnitEnum|null $navigationGroup = 'User features';

    protected static ?string $navigationLabel = 'Resource Sharing';

    protected static ?string $modelLabel = 'Resource Invitation';

    protected static ?string $pluralModelLabel = 'Resource Invitations';

    protected static ?int $navigationSort = 6;

    public static function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query): Builder => $query->with([
                'inviter',
                'acceptedBy',
                'petDetail.pet',
                'groupDetail.group',
                'ledgerDetail.ledger',
            ]))
            ->columns([
                Tables\Columns\TextColumn::make('type')
                    ->badge()
                    ->sortable(),
                Tables\Columns\TextColumn::make('target')
                    ->label('Target')
                    ->getStateUsing(fn (ResourceInvitation $record): string => static::targetLabel($record)),
                Tables\Columns\TextColumn::make('role')
                    ->getStateUsing(fn (ResourceInvitation $record): string => static::roleLabel($record))
                    ->badge(),
                Tables\Columns\TextColumn::make('inviter.name')
                    ->label('Inviter')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('acceptedBy.name')
                    ->label('Recipient')
                    ->placeholder('Not accepted')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable(),
                Tables\Columns\TextColumn::make('expires_at')
                    ->label('Expires')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('type')
                    ->options(ResourceInvitationType::class),
                Tables\Filters\SelectFilter::make('status')
                    ->options(ResourceInvitationStatus::class),
            ])
            ->actions([
                Actions\ViewAction::make(),
                static::revokeAction(),
            ])
            ->bulkActions([])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListResourceInvitations::route('/'),
            'view' => Pages\ViewResourceInvitation::route('/{record}'),
        ];
    }

    public static function canAccess(): bool
    {
        $user = auth()->user();

        return $user instanceof User && $user->hasRole(['admin', 'super_admin']);
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit(Model $record): bool
    {
        return false;
    }

    public static function canDelete(Model $record): bool
    {
        return false;
    }

    public static function targetLabel(ResourceInvitation $invitation): string
    {
        return match ($invitation->type) {
            ResourceInvitationType::PET => $invitation->petDetail?->pet->name ?? 'Missing pet',
            ResourceInvitationType::GROUP => $invitation->groupDetail?->group->name ?? 'Missing group',
            ResourceInvitationType::LEDGER => $invitation->ledgerDetail?->ledger->title ?? 'Missing ledger',
        };
    }

    public static function roleLabel(ResourceInvitation $invitation): string
    {
        return match ($invitation->type) {
            ResourceInvitationType::PET => $invitation->petDetail?->relationship_type->value ?? 'Unknown',
            ResourceInvitationType::GROUP => $invitation->groupDetail?->role->value ?? 'Unknown',
            ResourceInvitationType::LEDGER => 'member',
        };
    }

    public static function revokeAction(): Actions\Action
    {
        return Actions\Action::make('revoke')
            ->icon('heroicon-o-x-mark')
            ->color('danger')
            ->visible(fn (ResourceInvitation $record): bool => $record->isPendingAndUnexpired())
            ->requiresConfirmation()
            ->action(function (ResourceInvitation $record): void {
                try {
                    app(ResourceInvitationService::class)->revoke($record);

                    Notification::make()
                        ->title('Resource invitation revoked')
                        ->success()
                        ->send();
                } catch (RuntimeException) {
                    Notification::make()
                        ->title('Invitation is no longer revocable')
                        ->danger()
                        ->send();
                }
            });
    }
}
