<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\ContentTranslationResource\Pages;
use App\Models\ContentTranslation;
use App\Models\User;
use App\Services\Translation\ContentTranslationService;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class ContentTranslationResource extends Resource
{
    protected static ?string $model = ContentTranslation::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-language';

    protected static string|\UnitEnum|null $navigationGroup = 'Operations';

    protected static ?string $navigationLabel = 'Translation Operations';

    protected static ?int $navigationSort = 8;

    public static function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query): Builder => $query->with('translatable'))
            ->columns([
                Tables\Columns\TextColumn::make('updated_at')->label('Updated')->since()->sortable(),
                Tables\Columns\TextColumn::make('translatable_type')
                    ->label('Content Type')
                    ->formatStateUsing(fn (string $state): string => class_basename($state))
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('translatable_id')->label('Content ID')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('field')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('source_locale')->label('Source')->badge()->sortable(),
                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->formatStateUsing(fn (string $state, ContentTranslation $record): string => self::isStale($record) ? 'stale' : $state)
                    ->color(fn (string $state, ContentTranslation $record): string => match (true) {
                        self::isStale($record), $state === ContentTranslation::STATUS_FAILED => 'danger',
                        $state === ContentTranslation::STATUS_PENDING => 'warning',
                        default => 'success',
                    })
                    ->sortable(),
                Tables\Columns\TextColumn::make('error')
                    ->limit(80)
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('translated_at')
                    ->label('Translated')
                    ->since()
                    ->placeholder('Never')
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        ContentTranslation::STATUS_PENDING => 'Pending',
                        ContentTranslation::STATUS_FAILED => 'Failed',
                        ContentTranslation::STATUS_TRANSLATED => 'Translated',
                    ]),
                Tables\Filters\Filter::make('needs_attention')
                    ->label('Pending or failed')
                    ->query(fn (Builder $query): Builder => $query->whereIn('status', [
                        ContentTranslation::STATUS_PENDING,
                        ContentTranslation::STATUS_FAILED,
                    ])),
                Tables\Filters\SelectFilter::make('source_locale')
                    ->label('Source locale')
                    ->options(fn (): array => collect(config('locales.supported', []))
                        ->filter(fn (mixed $locale): bool => is_string($locale))
                        ->mapWithKeys(fn (string $locale): array => [$locale => strtoupper($locale)])
                        ->all()),
            ])
            ->actions([
                Actions\Action::make('retry')
                    ->icon('heroicon-o-arrow-path')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->modalHeading('Retry translation')
                    ->modalDescription('The current source field will be queued for translation. Existing generated translations will not be edited directly.')
                    ->visible(fn (ContentTranslation $record): bool => $record->status === ContentTranslation::STATUS_FAILED || self::isStale($record))
                    ->action(function (ContentTranslation $record): void {
                        $queued = app(ContentTranslationService::class)->retry($record);

                        Notification::make()
                            ->title($queued ? 'Translation queued' : 'Translation could not be queued')
                            ->body($queued ? null : 'The source record or source text is no longer available.')
                            ->color($queued ? 'success' : 'danger')
                            ->send();
                    }),
            ])
            ->bulkActions([])
            ->defaultSort('updated_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListContentTranslations::route('/'),
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

    public static function canDeleteAny(): bool
    {
        return false;
    }

    private static function isStale(ContentTranslation $record): bool
    {
        return app(ContentTranslationService::class)->isStale($record);
    }
}
