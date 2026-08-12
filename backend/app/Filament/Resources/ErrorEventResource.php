<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\ErrorEventResource\Pages;
use App\Models\ErrorEvent;
use App\Models\User;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class ErrorEventResource extends Resource
{
    protected static ?string $model = ErrorEvent::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-exclamation-triangle';

    protected static string|\UnitEnum|null $navigationGroup = 'Operations';

    protected static ?string $navigationLabel = 'Runtime Errors';

    protected static ?int $navigationSort = 5;

    public static function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('occurred_at')->label('Occurred')->dateTime()->sortable(),
                Tables\Columns\TextColumn::make('source')->badge()->searchable()->sortable(),
                Tables\Columns\TextColumn::make('message')->searchable()->limit(80)->wrap(),
                Tables\Columns\TextColumn::make('exception_class')->label('Exception')->searchable()->limit(50)->toggleable(),
                Tables\Columns\TextColumn::make('route')->searchable()->limit(60),
                Tables\Columns\TextColumn::make('status_code')->label('Status')->badge()->sortable()->placeholder('—'),
                Tables\Columns\TextColumn::make('app_version')->label('Version')->searchable()->sortable()->placeholder('Unknown'),
                Tables\Columns\TextColumn::make('user_id')->label('User ID')->searchable()->sortable()->placeholder('Guest'),
                Tables\Columns\TextColumn::make('fingerprint')->searchable()->copyable()->limit(12)->toggleable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('source')->options([
                    'backend' => 'Backend',
                    'frontend' => 'Frontend',
                ]),
                Tables\Filters\SelectFilter::make('app_version')
                    ->label('App version')
                    ->options(fn (): array => ErrorEvent::query()
                        ->whereNotNull('app_version')
                        ->distinct()
                        ->orderBy('app_version')
                        ->pluck('app_version', 'app_version')
                        ->all()),
                Tables\Filters\Filter::make('occurred_at')
                    ->form([
                        Forms\Components\DatePicker::make('from'),
                        Forms\Components\DatePicker::make('until'),
                    ])
                    ->query(fn (Builder $query, array $data): Builder => $query
                        ->when($data['from'] ?? null, fn (Builder $query, mixed $date): Builder => $query->whereDate('occurred_at', '>=', $date))
                        ->when($data['until'] ?? null, fn (Builder $query, mixed $date): Builder => $query->whereDate('occurred_at', '<=', $date))),
            ])
            ->actions([
                Actions\ViewAction::make(),
            ])
            ->bulkActions([])
            ->defaultSort('occurred_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListErrorEvents::route('/'),
            'view' => Pages\ViewErrorEvent::route('/{record}'),
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
