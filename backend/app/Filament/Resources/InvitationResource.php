<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Enums\InvitationStatus;
use App\Filament\Resources\InvitationResource\Pages;
use App\Models\Invitation;
use App\Services\InvitationService;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class InvitationResource extends Resource
{
    protected static ?string $model = Invitation::class;

    protected static ?string $navigationIcon = 'heroicon-o-envelope';

    protected static ?string $navigationGroup = 'Users & Invites';

    protected static ?string $navigationLabel = 'Invitations';

    protected static ?string $modelLabel = 'Invitation';

    protected static ?string $pluralModelLabel = 'Invitations';

    protected static ?int $navigationSort = 3;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Invitation Details')
                    ->schema([
                        Forms\Components\TextInput::make('code')
                            ->label('Invitation Code')
                            ->required()
                            ->unique(ignoreRecord: true)
                            ->maxLength(255)
                            ->disabled(fn (string $operation): bool => $operation === 'edit'),

                        Forms\Components\Select::make('inviter_user_id')
                            ->label('Inviter')
                            ->relationship('inviter', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),

                        Forms\Components\Select::make('recipient_user_id')
                            ->label('Recipient')
                            ->relationship('recipient', 'name')
                            ->searchable()
                            ->preload()
                            ->nullable(),

                        Forms\Components\Select::make('status')
                            ->label('Status')
                            ->options(InvitationStatus::class)
                            ->required(),

                        Forms\Components\DateTimePicker::make('expires_at')
                            ->label('Expires At')
                            ->nullable(),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('code')
                    ->label('Code')
                    ->searchable()
                    ->copyable()
                    ->copyMessage('Code copied')
                    ->copyMessageDuration(1500)
                    ->limit(20),

                Tables\Columns\TextColumn::make('inviter.name')
                    ->label('Inviter')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('recipient.name')
                    ->label('Recipient')
                    ->searchable()
                    ->sortable()
                    ->placeholder('Not accepted'),

                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge(),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('expires_at')
                    ->label('Expires')
                    ->dateTime()
                    ->sortable()
                    ->toggleable()
                    ->placeholder('Never'),

                Tables\Columns\TextColumn::make('days_since_created')
                    ->label('Age')
                    ->getStateUsing(function (Invitation $record): string {
                        $days = $record->created_at->diffInDays(now());

                        return $days.' day'.($days !== 1 ? 's' : '');
                    })
                    ->sortable(query: function (Builder $query, string $direction): Builder {
                        return $query->orderBy('created_at', $direction === 'asc' ? 'desc' : 'asc');
                    }),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options(InvitationStatus::class),

                Tables\Filters\SelectFilter::make('inviter')
                    ->relationship('inviter', 'name')
                    ->searchable()
                    ->preload(),

                Tables\Filters\Filter::make('expired')
                    ->label('Expired')
                    ->query(
                        fn (Builder $query): Builder => $query->where('expires_at', '<', now())
                            ->where('status', InvitationStatus::PENDING)
                    ),

                Tables\Filters\Filter::make('recent')
                    ->label('Recent (Last 7 days)')
                    ->query(fn (Builder $query): Builder => $query->where('created_at', '>=', now()->subDays(7))),
            ])
            ->actions([
                Tables\Actions\Action::make('copy_url')
                    ->label('Copy URL')
                    ->icon('heroicon-o-clipboard')
                    ->color('info')
                    ->action(function (Invitation $record, $livewire): void {
                        $url = $record->getInvitationUrl();

                        $script = sprintf(<<<'JS'
(() => {
    const url = %s;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).catch(() => window.prompt("Copy invitation URL:", url));
    } else {
        window.prompt("Copy invitation URL:", url);
    }
})()
JS, json_encode($url));

                        // Livewire v3: execute JS on the client to copy to clipboard.
                        // Fallback to prompt() when Clipboard API is unavailable/blocked.
                        $livewire->js($script);

                        Notification::make()
                            ->title('Invitation URL Copied')
                            ->body('The invitation URL has been copied to your clipboard.')
                            ->success()
                            ->send();
                    }),

                Tables\Actions\Action::make('revoke')
                    ->label('Revoke')
                    ->icon('heroicon-o-x-mark')
                    ->color('danger')
                    ->visible(fn (Invitation $record): bool => $record->status === InvitationStatus::PENDING)
                    ->action(function (Invitation $record): void {
                        $record->markAsRevoked();

                        Notification::make()
                            ->title('Invitation Revoked')
                            ->body('The invitation has been revoked and can no longer be used.')
                            ->success()
                            ->send();
                    })
                    ->requiresConfirmation()
                    ->modalHeading('Revoke Invitation')
                    ->modalDescription('Are you sure you want to revoke this invitation? This action cannot be undone.'),

                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\BulkAction::make('revoke_selected')
                        ->label('Revoke Selected')
                        ->icon('heroicon-o-x-mark')
                        ->color('danger')
                        ->action(function (Collection $records): void {
                            /** @var Collection<int, \App\Models\Invitation> $records */
                            $pendingRecords = $records->filter(fn (\App\Models\Invitation $record) => $record->status === InvitationStatus::PENDING);

                            if ($pendingRecords->isEmpty()) {
                                Notification::make()
                                    ->title('No Pending Invitations')
                                    ->body('No pending invitations were selected.')
                                    ->warning()
                                    ->send();

                                return;
                            }

                            $count = 0;
                            foreach ($pendingRecords as $record) {
                                $record->markAsRevoked();
                                $count++;
                            }

                            Notification::make()
                                ->title('Invitations Revoked')
                                ->body("Revoked {$count} invitation(s).")
                                ->success()
                                ->send();
                        })
                        ->requiresConfirmation()
                        ->modalHeading('Revoke Selected Invitations')
                        ->modalDescription('Are you sure you want to revoke the selected invitations? This action cannot be undone.'),

                    Tables\Actions\BulkAction::make('cleanup_expired')
                        ->label('Mark Expired as Expired')
                        ->icon('heroicon-o-clock')
                        ->color('warning')
                        ->action(function (): void {
                            $invitationService = app(InvitationService::class);
                            $count = $invitationService->cleanupExpiredInvitations();

                            Notification::make()
                                ->title('Expired Invitations Cleaned')
                                ->body("Marked {$count} expired invitation(s) as expired.")
                                ->success()
                                ->send();
                        })
                        ->requiresConfirmation()
                        ->modalHeading('Cleanup Expired Invitations')
                        ->modalDescription('Mark all expired invitations as expired?'),

                    Tables\Actions\DeleteBulkAction::make()
                        ->visible(fn (): bool => auth()->user()->hasRole('super_admin')),
                ]),
            ])
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading('No Invitations')
            ->emptyStateDescription('No invitations have been created yet.')
            ->emptyStateIcon('heroicon-o-envelope');
    }

    public static function getRelations(): array
    {
        return [

        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListInvitations::route('/'),
            'create' => Pages\CreateInvitation::route('/create'),
            'view' => Pages\ViewInvitation::route('/{record}'),
            'edit' => Pages\EditInvitation::route('/{record}/edit'),
        ];
    }

    public static function getNavigationBadge(): ?string
    {
        $count = static::getModel()::pending()->count();

        return $count > 0 ? (string) $count : null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        $pendingCount = static::getModel()::pending()->count();

        if ($pendingCount === 0) {
            return null;
        }

        return 'primary';
    }

    /**
     * Determine if the user can access this resource
     */
    public static function canAccess(): bool
    {
        return auth()->check() && auth()->user()->hasRole(['admin', 'super_admin']);
    }
}
