<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ReviewResource\Pages;
use App\Models\Review;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Actions\BulkAction;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;

class ReviewResource extends Resource
{
    protected static ?string $model = Review::class;

    protected static ?string $navigationIcon = 'heroicon-o-star';

    protected static ?string $navigationGroup = 'Users & Helpers';

    protected static ?int $navigationSort = 3;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Review Details')
                    ->schema([
                        Forms\Components\Select::make('reviewer_user_id')
                            ->label('Reviewer')
                            ->relationship('reviewer', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),

                        Forms\Components\Select::make('reviewed_user_id')
                            ->label('Reviewed User')
                            ->relationship('reviewed', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),

                        Forms\Components\Select::make('transfer_id')
                            ->label('Related Transfer')
                            ->relationship('transfer', 'id')
                            ->searchable()
                            ->preload()
                            ->nullable(),

                        Forms\Components\TextInput::make('rating')
                            ->label('Rating')
                            ->numeric()
                            ->minValue(1)
                            ->maxValue(5)
                            ->required()
                            ->helperText('Rating from 1 to 5 stars'),

                        Forms\Components\RichEditor::make('comment')
                            ->label('Review Content')
                            ->columnSpanFull()
                            ->nullable(),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Moderation')
                    ->schema([
                        Forms\Components\Select::make('status')
                            ->label('Status')
                            ->options([
                                'active' => 'Active',
                                'hidden' => 'Hidden',
                                'flagged' => 'Flagged',
                                'deleted' => 'Deleted',
                            ])
                            ->default('active')
                            ->required(),

                        Forms\Components\Toggle::make('is_flagged')
                            ->label('Flagged for Review')
                            ->default(false),

                        Forms\Components\DateTimePicker::make('flagged_at')
                            ->label('Flagged At')
                            ->nullable(),

                        Forms\Components\Textarea::make('moderation_notes')
                            ->label('Moderation Notes')
                            ->columnSpanFull()
                            ->nullable()
                            ->helperText('Internal notes for moderation team'),

                        Forms\Components\Select::make('moderated_by')
                            ->label('Moderated By')
                            ->relationship('moderator', 'name')
                            ->searchable()
                            ->preload()
                            ->nullable(),

                        Forms\Components\DateTimePicker::make('moderated_at')
                            ->label('Moderated At')
                            ->nullable(),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('reviewer.name')
                    ->label('Reviewer')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('reviewed.name')
                    ->label('Reviewed User')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('rating')
                    ->label('Rating')
                    ->formatStateUsing(fn (string $state): string => str_repeat('⭐', (int) $state))
                    ->sortable(),

                Tables\Columns\TextColumn::make('comment')
                    ->label('Content Preview')
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
                        'success' => 'active',
                        'warning' => 'flagged',
                        'danger' => 'hidden',
                        'secondary' => 'deleted',
                    ]),

                Tables\Columns\IconColumn::make('is_flagged')
                    ->label('Flagged')
                    ->boolean()
                    ->trueIcon('heroicon-o-flag')
                    ->falseIcon('heroicon-o-minus')
                    ->trueColor('danger')
                    ->falseColor('gray'),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('moderated_at')
                    ->label('Moderated')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->options([
                        'active' => 'Active',
                        'hidden' => 'Hidden',
                        'flagged' => 'Flagged',
                        'deleted' => 'Deleted',
                    ]),

                SelectFilter::make('rating')
                    ->options([
                        '1' => '1 Star',
                        '2' => '2 Stars',
                        '3' => '3 Stars',
                        '4' => '4 Stars',
                        '5' => '5 Stars',
                    ]),

                Filter::make('flagged_content')
                    ->label('Flagged Content')
                    ->query(fn (Builder $query): Builder => $query->where('is_flagged', true)),

                Filter::make('created_at')
                    ->form([
                        Forms\Components\DatePicker::make('created_from')
                            ->label('Created From'),
                        Forms\Components\DatePicker::make('created_until')
                            ->label('Created Until'),
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
                Tables\Actions\Action::make('hide')
                    ->label('Hide')
                    ->icon('heroicon-o-eye-slash')
                    ->color('warning')
                    ->visible(fn (Review $record): bool => $record->status === 'active')
                    ->requiresConfirmation()
                    ->action(function (Review $record): void {
                        $record->update([
                            'status' => 'hidden',
                            'moderated_by' => Auth::id(),
                            'moderated_at' => now(),
                        ]);
                    }),

                Tables\Actions\Action::make('show')
                    ->label('Show')
                    ->icon('heroicon-o-eye')
                    ->color('success')
                    ->visible(fn (Review $record): bool => $record->status === 'hidden')
                    ->requiresConfirmation()
                    ->action(function (Review $record): void {
                        $record->update([
                            'status' => 'active',
                            'moderated_by' => Auth::id(),
                            'moderated_at' => now(),
                        ]);
                    }),

                Tables\Actions\Action::make('flag')
                    ->label('Flag')
                    ->icon('heroicon-o-flag')
                    ->color('danger')
                    ->visible(fn (Review $record): bool => ! $record->is_flagged)
                    ->form([
                        Forms\Components\Textarea::make('moderation_notes')
                            ->label('Reason for flagging')
                            ->required(),
                    ])
                    ->action(function (Review $record, array $data): void {
                        $record->update([
                            'is_flagged' => true,
                            'flagged_at' => now(),
                            'status' => 'flagged',
                            'moderation_notes' => $data['moderation_notes'],
                            'moderated_by' => Auth::id(),
                            'moderated_at' => now(),
                        ]);
                    }),

                Tables\Actions\Action::make('unflag')
                    ->label('Unflag')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->visible(fn (Review $record): bool => $record->is_flagged)
                    ->requiresConfirmation()
                    ->action(function (Review $record): void {
                        $record->update([
                            'is_flagged' => false,
                            'flagged_at' => null,
                            'status' => 'active',
                            'moderated_by' => Auth::id(),
                            'moderated_at' => now(),
                        ]);
                    }),

                Tables\Actions\EditAction::make(),

                Tables\Actions\DeleteAction::make()
                    ->requiresConfirmation()
                    ->action(function (Review $record): void {
                        $record->update([
                            'status' => 'deleted',
                            'moderated_by' => Auth::id(),
                            'moderated_at' => now(),
                        ]);
                    }),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    BulkAction::make('hide')
                        ->label('Hide Selected')
                        ->icon('heroicon-o-eye-slash')
                        ->color('warning')
                        ->requiresConfirmation()
                        ->action(function (Collection $records): void {
                            /** @var Collection<int, \App\Models\Review> $records */
                            $records->each(function (\App\Models\Review $record): void {
                                $record->update([
                                    'status' => 'hidden',
                                    'moderated_by' => Auth::id(),
                                    'moderated_at' => now(),
                                ]);
                            });
                        }),

                    BulkAction::make('show')
                        ->label('Show Selected')
                        ->icon('heroicon-o-eye')
                        ->color('success')
                        ->requiresConfirmation()
                        ->action(function (Collection $records): void {
                            /** @var Collection<int, \App\Models\Review> $records */
                            $records->each(function (\App\Models\Review $record): void {
                                $record->update([
                                    'status' => 'active',
                                    'moderated_by' => Auth::id(),
                                    'moderated_at' => now(),
                                ]);
                            });
                        }),

                    BulkAction::make('flag')
                        ->label('Flag Selected')
                        ->icon('heroicon-o-flag')
                        ->color('danger')
                        ->form([
                            Forms\Components\Textarea::make('moderation_notes')
                                ->label('Reason for flagging')
                                ->required(),
                        ])
                        ->action(function (Collection $records, array $data): void {
                            /** @var Collection<int, \App\Models\Review> $records */
                            $records->each(function (\App\Models\Review $record) use ($data): void {
                                $record->update([
                                    'is_flagged' => true,
                                    'flagged_at' => now(),
                                    'status' => 'flagged',
                                    'moderation_notes' => $data['moderation_notes'],
                                    'moderated_by' => Auth::id(),
                                    'moderated_at' => now(),
                                ]);
                            });
                        }),

                    Tables\Actions\DeleteBulkAction::make()
                        ->label('Delete Selected')
                        ->requiresConfirmation()
                        ->action(function (Collection $records): void {
                            /** @var Collection<int, \App\Models\Review> $records */
                            $records->each(function (\App\Models\Review $record): void {
                                $record->update([
                                    'status' => 'deleted',
                                    'moderated_by' => Auth::id(),
                                    'moderated_at' => now(),
                                ]);
                            });
                        }),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [

        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListReviews::route('/'),
            'create' => Pages\CreateReview::route('/create'),
            'edit' => Pages\EditReview::route('/{record}/edit'),
        ];
    }
}
