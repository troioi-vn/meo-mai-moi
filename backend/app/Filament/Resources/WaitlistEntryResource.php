<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\WaitlistEntryResource\Pages;
use App\Models\WaitlistEntry;
use App\Services\WaitlistService;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class WaitlistEntryResource extends Resource
{
    protected static ?string $model = WaitlistEntry::class;

    protected static ?string $navigationIcon = 'heroicon-o-queue-list';

    protected static ?string $navigationGroup = 'Invitation';

    protected static ?string $navigationLabel = 'Waitlist';

    protected static ?string $modelLabel = 'Waitlist Entry';

    protected static ?string $pluralModelLabel = 'Waitlist Entries';

    protected static ?int $navigationSort = 3;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Waitlist Entry Details')
                    ->schema([
                        Forms\Components\TextInput::make('email')
                            ->label('Email Address')
                            ->email()
                            ->required()
                            ->unique(ignoreRecord: true)
                            ->maxLength(255),

                        Forms\Components\Select::make('status')
                            ->label('Status')
                            ->options([
                                'pending' => 'Pending',
                                'invited' => 'Invited',
                            ])
                            ->default('pending')
                            ->required(),

                        Forms\Components\DateTimePicker::make('invited_at')
                            ->label('Invited At')
                            ->nullable()
                            ->visible(fn (Forms\Get $get): bool => $get('status') === 'invited'),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('email')
                    ->label('Email Address')
                    ->searchable()
                    ->sortable()
                    ->copyable()
                    ->copyMessage('Email copied')
                    ->copyMessageDuration(1500),

                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'pending' => 'warning',
                        'invited' => 'success',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => ucfirst($state)),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Joined Waitlist')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('invited_at')
                    ->label('Invited At')
                    ->dateTime()
                    ->sortable()
                    ->toggleable()
                    ->placeholder('Not invited'),

                Tables\Columns\TextColumn::make('days_waiting')
                    ->label('Days Waiting')
                    ->getStateUsing(function (WaitlistEntry $record): string {
                        $days = $record->created_at->diffInDays(now());

                        return $days.' day'.($days !== 1 ? 's' : '');
                    })
                    ->sortable(query: function (Builder $query, string $direction): Builder {
                        return $query->orderBy('created_at', $direction === 'asc' ? 'desc' : 'asc');
                    }),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'pending' => 'Pending',
                        'invited' => 'Invited',
                    ]),

                Tables\Filters\Filter::make('recent')
                    ->label('Recent (Last 7 days)')
                    ->query(fn (Builder $query): Builder => $query->where('created_at', '>=', now()->subDays(7))),

                Tables\Filters\Filter::make('long_waiting')
                    ->label('Long waiting (30+ days)')
                    ->query(fn (Builder $query): Builder => $query->where('created_at', '<=', now()->subDays(30))),
            ])
            ->actions([
                Tables\Actions\Action::make('send_invitation')
                    ->label('Send Invitation')
                    ->icon('heroicon-o-paper-airplane')
                    ->color('success')
                    ->visible(fn (WaitlistEntry $record): bool => $record->status === 'pending')
                    ->action(function (WaitlistEntry $record): void {
                        $waitlistService = app(WaitlistService::class);
                        $user = auth()->user();

                        try {
                            $invitation = $waitlistService->inviteFromWaitlist($record->email, $user);

                            if ($invitation) {
                                Notification::make()
                                    ->title('Invitation Sent')
                                    ->body("Invitation sent to {$record->email}")
                                    ->success()
                                    ->send();
                            } else {
                                Notification::make()
                                    ->title('Failed to Send Invitation')
                                    ->body('Unable to send invitation. Please try again.')
                                    ->danger()
                                    ->send();
                            }
                        } catch (\Exception $e) {
                            Notification::make()
                                ->title('Error')
                                ->body('Failed to send invitation: '.$e->getMessage())
                                ->danger()
                                ->send();
                        }
                    })
                    ->requiresConfirmation()
                    ->modalHeading('Send Invitation')
                    ->modalDescription(fn (WaitlistEntry $record): string => "Send an invitation to {$record->email}?"),

                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\BulkAction::make('send_invitations')
                        ->label('Send Invitations')
                        ->icon('heroicon-o-paper-airplane')
                        ->color('success')
                        ->action(function (Collection $records): void {
                            /** @var Collection<int, \App\Models\WaitlistEntry> $records */
                            $waitlistService = app(WaitlistService::class);
                            $user = auth()->user();

                            $pendingRecords = $records->filter(fn (\App\Models\WaitlistEntry $record) => $record->status === 'pending');
                            $emails = $pendingRecords->pluck('email')->toArray();

                            if (empty($emails)) {
                                Notification::make()
                                    ->title('No Pending Entries')
                                    ->body('No pending waitlist entries selected.')
                                    ->warning()
                                    ->send();

                                return;
                            }

                            try {
                                $results = $waitlistService->bulkInviteFromWaitlist($emails, $user);
                                $successful = collect($results)->where('success', true)->count();
                                $failed = collect($results)->where('success', false)->count();

                                $message = "Sent {$successful} invitation(s)";
                                if ($failed > 0) {
                                    $message .= ", {$failed} failed";
                                }

                                Notification::make()
                                    ->title('Bulk Invitations Processed')
                                    ->body($message)
                                    ->success()
                                    ->send();
                            } catch (\Exception $e) {
                                Notification::make()
                                    ->title('Error')
                                    ->body('Failed to send invitations: '.$e->getMessage())
                                    ->danger()
                                    ->send();
                            }
                        })
                        ->requiresConfirmation()
                        ->modalHeading('Send Bulk Invitations')
                        ->modalDescription('Send invitations to all selected pending waitlist entries?'),

                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading('No Waitlist Entries')
            ->emptyStateDescription('No users have joined the waitlist yet.')
            ->emptyStateIcon('heroicon-o-queue-list');
    }

    public static function getRelations(): array
    {
        return [

        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListWaitlistEntries::route('/'),
            'create' => Pages\CreateWaitlistEntry::route('/create'),
            'view' => Pages\ViewWaitlistEntry::route('/{record}'),
            'edit' => Pages\EditWaitlistEntry::route('/{record}/edit'),
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

        return $pendingCount > 10 ? 'warning' : 'primary';
    }

    /**
     * Determine if the user can access this resource
     */
    public static function canAccess(): bool
    {
        return auth()->check() && auth()->user()->hasRole(['admin', 'super_admin']);
    }
}
