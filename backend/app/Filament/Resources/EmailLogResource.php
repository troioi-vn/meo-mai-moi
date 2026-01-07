<?php

namespace App\Filament\Resources;

use App\Filament\Resources\EmailLogResource\Pages;
use App\Jobs\SendNotificationEmail;
use App\Models\EmailLog;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class EmailLogResource extends Resource
{
    protected static ?string $model = EmailLog::class;

    protected static ?string $navigationIcon = 'heroicon-o-envelope';

    protected static ?string $navigationGroup = 'System';

    protected static ?int $navigationSort = 3;

    protected static ?string $navigationLabel = 'Email Logs';

    protected static ?string $modelLabel = 'Email Log';

    protected static ?string $pluralModelLabel = 'Email Logs';

    protected static ?string $recordTitleAttribute = 'subject';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Email Details')
                    ->schema([
                        Forms\Components\TextInput::make('recipient_email')
                            ->label('Recipient Email')
                            ->disabled(),
                        Forms\Components\TextInput::make('subject')
                            ->label('Subject')
                            ->disabled()
                            ->columnSpanFull(),
                        Forms\Components\ViewField::make('body')
                            ->label('Email Body')
                            ->view('filament.components.email-body-preview')
                            ->columnSpanFull(),
                    ]),

                Forms\Components\Section::make('Delivery Information')
                    ->schema([
                        Forms\Components\Select::make('status')
                            ->label('Status')
                            ->options([
                                'pending' => 'Pending',
                                'accepted' => 'Accepted',
                                'delivered' => 'Delivered',
                                'failed' => 'Failed',
                                'bounced' => 'Bounced',
                            ])
                            ->disabled(),
                        Forms\Components\TextInput::make('retry_count')
                            ->label('Retry Count')
                            ->disabled(),
                        Forms\Components\Textarea::make('smtp_response')
                            ->label('SMTP Response')
                            ->disabled()
                            ->rows(3)
                            ->columnSpanFull(),
                        Forms\Components\Textarea::make('error_message')
                            ->label('Error Message')
                            ->disabled()
                            ->rows(3)
                            ->columnSpanFull()
                            ->visible(fn ($record) => ! empty($record->error_message)),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Related Records')
                    ->schema([
                        Forms\Components\Select::make('user_id')
                            ->label('User')
                            ->relationship(
                                'user',
                                'name',
                                fn (Builder $query) => $query->whereNotNull('name')
                            )
                            ->getOptionLabelFromRecordUsing(fn ($record) => $record?->name ?: $record?->email)
                            ->disabled(),
                        Forms\Components\Select::make('email_configuration_id')
                            ->label('Email Configuration')
                            ->relationship(
                                'emailConfiguration',
                                'name',
                                fn (Builder $query) => $query->whereNotNull('name')
                            )
                            ->getOptionLabelFromRecordUsing(fn ($record) => $record?->getDisplayName())
                            ->disabled(),
                        Forms\Components\TextInput::make('notification_id')
                            ->label('Notification ID')
                            ->disabled(),
                    ])
                    ->columns(3),

                Forms\Components\Section::make('Timestamps')
                    ->schema([
                        Forms\Components\DateTimePicker::make('created_at')
                            ->label('Created At')
                            ->disabled(),
                        Forms\Components\DateTimePicker::make('sent_at')
                            ->label('Accepted At')
                            ->disabled(),
                        Forms\Components\DateTimePicker::make('delivered_at')
                            ->label('Delivered At')
                            ->disabled(),
                        Forms\Components\DateTimePicker::make('failed_at')
                            ->label('Failed At')
                            ->disabled(),
                        Forms\Components\DateTimePicker::make('opened_at')
                            ->label('Opened At')
                            ->disabled(),
                        Forms\Components\DateTimePicker::make('clicked_at')
                            ->label('Clicked At')
                            ->disabled(),
                        Forms\Components\DateTimePicker::make('unsubscribed_at')
                            ->label('Unsubscribed At')
                            ->disabled(),
                        Forms\Components\DateTimePicker::make('complained_at')
                            ->label('Complained At')
                            ->disabled(),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->columns([
                Tables\Columns\TextColumn::make('recipient_email')
                    ->label('Recipient')
                    ->searchable()
                    ->sortable()
                    ->copyable()
                    ->copyMessage('Email copied')
                    ->weight('medium'),

                Tables\Columns\TextColumn::make('subject')
                    ->label('Subject')
                    ->searchable()
                    ->limit(50)
                    ->tooltip(function (Tables\Columns\TextColumn $column): ?string {
                        $state = $column->getState();
                        if (strlen($state) <= 50) {
                            return null;
                        }

                        return $state;
                    }),

                Tables\Columns\BadgeColumn::make('status')
                    ->label('Status')
                    ->colors([
                        'warning' => fn ($state) => in_array($state, ['pending', 'accepted']),
                        'success' => 'delivered',
                        'danger' => fn ($state) => in_array($state, ['failed', 'bounced']),
                    ])
                    ->formatStateUsing(fn (EmailLog $record) => $record->getStatusDisplayName()),

                Tables\Columns\TextColumn::make('emailConfiguration.name')
                    ->label('Email Config')
                    ->placeholder('Unknown')
                    ->toggleable(),

                Tables\Columns\TextColumn::make('user.name')
                    ->label('User')
                    ->searchable()
                    ->sortable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('retry_count')
                    ->label('Retries')
                    ->alignCenter()
                    ->badge()
                    ->color(fn ($state) => $state > 0 ? 'warning' : 'gray'),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Queued At')
                    ->dateTime()
                    ->sortable()
                    ->since(),

                Tables\Columns\TextColumn::make('sent_at')
                    ->label('Accepted At')
                    ->dateTime()
                    ->sortable()
                    ->placeholder('Not accepted')
                    ->since()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('delivered_at')
                    ->label('Delivered At')
                    ->dateTime()
                    ->sortable()
                    ->placeholder('Not delivered')
                    ->since()
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('opened_at')
                    ->label('Opened At')
                    ->dateTime()
                    ->sortable()
                    ->placeholder('Not opened')
                    ->since()
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('clicked_at')
                    ->label('Clicked At')
                    ->dateTime()
                    ->sortable()
                    ->placeholder('Not clicked')
                    ->since()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'pending' => 'Pending',
                        'accepted' => 'Accepted',
                        'delivered' => 'Delivered',
                        'failed' => 'Failed',
                        'bounced' => 'Bounced',
                    ])
                    ->placeholder('All Statuses'),

                Tables\Filters\SelectFilter::make('email_configuration_id')
                    ->label('Email Configuration')
                    ->relationship(
                        'emailConfiguration',
                        'name',
                        fn (Builder $query) => $query->whereNotNull('name')
                    )
                    ->getOptionLabelFromRecordUsing(fn ($record) => $record?->getDisplayName())
                    ->placeholder('All Configurations'),

                Tables\Filters\Filter::make('has_errors')
                    ->label('Has Errors')
                    ->query(fn (Builder $query) => $query->whereNotNull('error_message')),

                Tables\Filters\Filter::make('created_at')
                    ->label('Date Range')
                    ->form([
                        Forms\Components\DatePicker::make('created_from')
                            ->label('From Date'),
                        Forms\Components\DatePicker::make('created_until')
                            ->label('Until Date'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['created_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('created_at', '>=', $date),
                            )
                            ->when(
                                $data['created_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('created_at', '<=', $date),
                            );
                    }),
            ])
            ->actions([
                Tables\Actions\ViewAction::make()
                    ->label('View Details'),

                Tables\Actions\Action::make('retry')
                    ->label('Retry')
                    ->icon('heroicon-o-arrow-path')
                    ->color('warning')
                    ->visible(fn (EmailLog $record) => $record->canRetry())
                    ->requiresConfirmation()
                    ->modalHeading('Retry Email Delivery')
                    ->modalDescription('This will attempt to resend the email. Continue?')
                    ->action(function (EmailLog $record) {
                        if (! $record->canRetry()) {
                            Notification::make()
                                ->title('Cannot Retry')
                                ->body('This email cannot be retried.')
                                ->danger()
                                ->send();

                            return;
                        }

                        try {
                            // Dispatch a new job to retry the email
                            if ($record->notification && $record->user && $record->user instanceof \App\Models\User) {
                                SendNotificationEmail::dispatch(
                                    $record->user,
                                    $record->notification->type,
                                    $record->notification->data ?? [],
                                    $record->notification->id
                                );

                                Notification::make()
                                    ->title('Email Retry Queued')
                                    ->body('The email has been queued for retry.')
                                    ->success()
                                    ->send();
                            } else {
                                throw new \Exception('Missing notification or user data for retry');
                            }
                        } catch (\Exception $e) {
                            Notification::make()
                                ->title('Retry Failed')
                                ->body('Failed to queue email for retry: '.$e->getMessage())
                                ->danger()
                                ->send();
                        }
                    }),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\BulkAction::make('retry_failed')
                        ->label('Retry Selected Failed Emails')
                        ->icon('heroicon-o-arrow-path')
                        ->color('warning')
                        ->requiresConfirmation()
                        ->action(function ($records) {
                            $retried = 0;
                            $skipped = 0;

                            foreach ($records as $record) {
                                if ($record->canRetry() && $record->notification && $record->user) {
                                    SendNotificationEmail::dispatch(
                                        $record->user,
                                        $record->notification->type,
                                        $record->notification->data ?? [],
                                        $record->notification->id
                                    );
                                    $retried++;
                                } else {
                                    $skipped++;
                                }
                            }

                            Notification::make()
                                ->title('Bulk Retry Complete')
                                ->body("Retried: {$retried}, Skipped: {$skipped}")
                                ->success()
                                ->send();
                        }),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [

        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListEmailLogs::route('/'),
            'view' => Pages\ViewEmailLog::route('/{record}'),
        ];
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit($record): bool
    {
        return false;
    }

    public static function canDelete($record): bool
    {
        return false;
    }
}
