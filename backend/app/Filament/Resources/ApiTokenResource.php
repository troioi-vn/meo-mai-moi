<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\ApiTokenResource\Pages;
use App\Models\User;
use App\Services\ApiTokenRevocationAuditService;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Laravel\Sanctum\PersonalAccessToken;

class ApiTokenResource extends Resource
{
    protected static ?string $model = PersonalAccessToken::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-key';

    protected static string|\UnitEnum|null $navigationGroup = 'System';

    protected static ?string $navigationLabel = 'API Keys';

    protected static ?string $modelLabel = 'API Key';

    protected static ?string $pluralModelLabel = 'API Keys';

    protected static ?int $navigationSort = 4;

    public static function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query): Builder => $query
                ->where('tokenable_type', User::class)
                ->with('tokenable'))
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Token')
                    ->searchable()
                    ->sortable()
                    ->weight('medium'),

                Tables\Columns\TextColumn::make('tokenable.name')
                    ->label('Owner')
                    ->searchable()
                    ->sortable()
                    ->placeholder('Unknown user'),

                Tables\Columns\TextColumn::make('tokenable.email')
                    ->label('Owner Email')
                    ->searchable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('abilities')
                    ->label('Abilities')
                    ->badge()
                    ->separator(',')
                    ->formatStateUsing(function ($state): string {
                        if (! is_array($state) || $state === []) {
                            return 'none';
                        }

                        return implode(', ', $state);
                    })
                    ->toggleable(),

                Tables\Columns\TextColumn::make('last_used_at')
                    ->label('Last Used')
                    ->since()
                    ->sortable()
                    ->placeholder('Never'),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('used')
                    ->label('Used')
                    ->nullable()
                    ->queries(
                        true: fn (Builder $query): Builder => $query->whereNotNull('last_used_at'),
                        false: fn (Builder $query): Builder => $query->whereNull('last_used_at'),
                        blank: fn (Builder $query): Builder => $query,
                    ),
            ])
            ->actions([
                Actions\Action::make('revoke')
                    ->label('Revoke')
                    ->icon('heroicon-o-no-symbol')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalHeading('Revoke API key')
                    ->modalDescription('This action cannot be undone. Integrations using this key will stop working immediately.')
                    ->action(function (PersonalAccessToken $record): void {
                        $actor = auth()->user();
                        $metadata = [
                            'ip' => request()->ip(),
                            'user_agent' => request()->userAgent(),
                        ];

                        app(ApiTokenRevocationAuditService::class)->revokeToken(
                            token: $record,
                            actor: $actor instanceof User ? $actor : null,
                            source: 'admin_panel',
                            metadata: $metadata,
                        );

                        Notification::make()
                            ->title('API key revoked')
                            ->success()
                            ->send();
                    }),
            ])
            ->bulkActions([])
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading('No API keys')
            ->emptyStateDescription('No personal access tokens have been created yet.');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListApiTokens::route('/'),
        ];
    }

    public static function canAccess(): bool
    {
        $user = auth()->user();

        return $user instanceof User && $user->can('manage_api_tokens');
    }

    public static function canCreate(): bool
    {
        return false;
    }
}
