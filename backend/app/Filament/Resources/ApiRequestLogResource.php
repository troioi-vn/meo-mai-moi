<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\ApiRequestLogResource\Pages;
use App\Models\ApiRequestLog;
use App\Models\User;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class ApiRequestLogResource extends Resource
{
    protected static ?string $model = ApiRequestLog::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-server-stack';

    protected static string|\UnitEnum|null $navigationGroup = 'Operations';

    protected static ?string $navigationLabel = 'API Request Logs';

    protected static ?int $navigationSort = 6;

    public static function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('created_at')->label('Time')->dateTime()->sortable(),
                Tables\Columns\TextColumn::make('method')->badge()->searchable()->sortable(),
                Tables\Columns\TextColumn::make('route_uri')
                    ->label('Route')
                    ->formatStateUsing(fn (?string $state, ApiRequestLog $record): string => $state ?: $record->path)
                    ->searchable(['route_uri', 'path'])
                    ->limit(70),
                Tables\Columns\TextColumn::make('status_code')
                    ->label('Status')
                    ->badge()
                    ->color(fn (int $state): string => $state >= 500 ? 'danger' : ($state >= 400 ? 'warning' : 'success'))
                    ->sortable(),
                Tables\Columns\TextColumn::make('auth_mode')->label('Auth')->badge()->searchable()->sortable(),
                Tables\Columns\TextColumn::make('user_id')->label('User ID')->searchable()->sortable()->placeholder('Guest'),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('method')
                    ->options(array_combine(
                        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
                        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
                    )),
                Tables\Filters\SelectFilter::make('auth_mode')
                    ->options([
                        'session' => 'Session',
                        'pat' => 'API key',
                        'guest' => 'Guest',
                    ]),
                Tables\Filters\Filter::make('errors')
                    ->query(fn (Builder $query): Builder => $query->where('status_code', '>=', 400)),
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
            'index' => Pages\ListApiRequestLogs::route('/'),
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
