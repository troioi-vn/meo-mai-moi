<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\ApiTokenRevocationAuditResource\Pages;
use App\Models\ApiTokenRevocationAudit;
use App\Models\User;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class ApiTokenRevocationAuditResource extends Resource
{
    protected static ?string $model = ApiTokenRevocationAudit::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-shield-exclamation';

    protected static string|\UnitEnum|null $navigationGroup = 'Operations';

    protected static ?string $navigationLabel = 'Token Revocation Audit';

    protected static ?int $navigationSort = 7;

    public static function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('created_at')->label('Revoked')->dateTime()->sortable(),
                Tables\Columns\TextColumn::make('token_name')->label('Token')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('target_email')
                    ->label('Target')
                    ->description(fn (ApiTokenRevocationAudit $record): ?string => $record->target_name)
                    ->searchable(['target_email', 'target_name']),
                Tables\Columns\TextColumn::make('actor_email')
                    ->label('Actor')
                    ->description(fn (ApiTokenRevocationAudit $record): ?string => $record->actor_name)
                    ->searchable(['actor_email', 'actor_name']),
                Tables\Columns\TextColumn::make('source')->badge()->searchable()->sortable(),
                Tables\Columns\TextColumn::make('token_last_used_at')
                    ->label('Last Used')
                    ->dateTime()
                    ->placeholder('Never')
                    ->sortable()
                    ->toggleable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('source')
                    ->options(fn (): array => ApiTokenRevocationAudit::query()
                        ->whereNotNull('source')
                        ->distinct()
                        ->orderBy('source')
                        ->pluck('source', 'source')
                        ->all()),
                Tables\Filters\Filter::make('created_at')
                    ->form([
                        Forms\Components\DatePicker::make('from'),
                        Forms\Components\DatePicker::make('until'),
                    ])
                    ->query(fn (Builder $query, array $data): Builder => $query
                        ->when($data['from'] ?? null, fn (Builder $query, mixed $date): Builder => $query->whereDate('created_at', '>=', $date))
                        ->when($data['until'] ?? null, fn (Builder $query, mixed $date): Builder => $query->whereDate('created_at', '<=', $date))),
            ])
            ->actions([])
            ->bulkActions([])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListApiTokenRevocationAudits::route('/'),
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
}
