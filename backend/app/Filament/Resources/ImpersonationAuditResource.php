<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\ImpersonationAuditResource\Pages;
use App\Models\ImpersonationAudit;
use App\Models\User;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class ImpersonationAuditResource extends Resource
{
    protected static ?string $model = ImpersonationAudit::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-user';

    protected static string|\UnitEnum|null $navigationGroup = 'Operations';

    protected static ?string $navigationLabel = 'Impersonation Audit';

    protected static ?int $navigationSort = 8;

    public static function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('created_at')->label('Started')->dateTime()->sortable(),
                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        ImpersonationAudit::STATUS_CONSUMED => 'warning',
                        ImpersonationAudit::STATUS_LEFT => 'success',
                        ImpersonationAudit::STATUS_REJECTED => 'danger',
                        ImpersonationAudit::STATUS_EXPIRED => 'gray',
                        default => 'info',
                    })
                    ->sortable(),
                Tables\Columns\TextColumn::make('target_email')
                    ->label('Target')
                    ->description(fn (ImpersonationAudit $record): ?string => $record->target_name)
                    ->searchable(['target_email', 'target_name']),
                Tables\Columns\TextColumn::make('impersonator_email')
                    ->label('Impersonator')
                    ->description(fn (ImpersonationAudit $record): ?string => $record->impersonator_name)
                    ->searchable(['impersonator_email', 'impersonator_name']),
                Tables\Columns\TextColumn::make('consumed_at')->label('Entered')->dateTime()->placeholder('—')->sortable()->toggleable(),
                Tables\Columns\TextColumn::make('left_at')->label('Left')->dateTime()->placeholder('—')->sortable()->toggleable(),
                Tables\Columns\TextColumn::make('rejection_reason')->label('Reason')->placeholder('—')->toggleable(),
                Tables\Columns\TextColumn::make('consumed_ip')->label('From IP')->placeholder('—')->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('issued_ip')->label('Issued IP')->placeholder('—')->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        ImpersonationAudit::STATUS_ISSUED => 'Issued',
                        ImpersonationAudit::STATUS_CONSUMED => 'Consumed',
                        ImpersonationAudit::STATUS_LEFT => 'Left',
                        ImpersonationAudit::STATUS_EXPIRED => 'Expired',
                        ImpersonationAudit::STATUS_REJECTED => 'Rejected',
                    ]),
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
            'index' => Pages\ListImpersonationAudits::route('/'),
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
