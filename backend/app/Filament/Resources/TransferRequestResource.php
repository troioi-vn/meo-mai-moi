<?php

namespace App\Filament\Resources;

use App\Filament\Resources\TransferRequestResource\Pages;
use App\Filament\Resources\TransferRequestResource\RelationManagers;
use App\Models\TransferRequest;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\DateTimePicker;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Actions\BulkActionGroup;
use Filament\Tables\Actions\DeleteBulkAction;
use Filament\Tables\Actions\Action;
use Filament\Notifications\Notification;

class TransferRequestResource extends Resource
{
    protected static ?string $model = TransferRequest::class;

    protected static ?string $navigationIcon = 'heroicon-o-arrow-path';

    protected static ?string $navigationGroup = 'Placements';

    protected static ?string $navigationLabel = 'Transfer Requests';

    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Select::make('placement_request_id')
                    ->label('Placement Request')
                    ->relationship('placementRequest', 'id')
                    ->getOptionLabelFromRecordUsing(fn ($record) => "#{$record->id} - {$record->cat->name} ({$record->request_type->value})")
                    ->searchable()
                    ->preload()
                    ->required(),

                Select::make('helper_profile_id')
                    ->label('Helper Profile')
                    ->relationship('helperProfile', 'id')
                    ->getOptionLabelFromRecordUsing(fn ($record) => $record->user->name . " ({$record->country})")
                    ->searchable()
                    ->preload()
                    ->required(),

                Select::make('requester_id')
                    ->label('Requester')
                    ->relationship('requester', 'name')
                    ->searchable()
                    ->preload()
                    ->required(),

                Select::make('status')
                    ->label('Status')
                    ->options([
                        'pending' => 'Pending',
                        'accepted' => 'Accepted',
                        'rejected' => 'Rejected',
                        'completed' => 'Completed',
                        'cancelled' => 'Cancelled',
                    ])
                    ->required()
                    ->default('pending'),

                Select::make('requested_relationship_type')
                    ->label('Relationship Type')
                    ->options([
                        'foster' => 'Foster',
                        'adopt' => 'Adopt',
                        'temporary' => 'Temporary Care',
                    ])
                    ->required(),

                Select::make('fostering_type')
                    ->label('Fostering Type')
                    ->options([
                        'short_term' => 'Short Term',
                        'long_term' => 'Long Term',
                        'emergency' => 'Emergency',
                        'medical' => 'Medical Foster',
                    ])
                    ->visible(fn (Forms\Get $get) => $get('requested_relationship_type') === 'foster'),

                Forms\Components\TextInput::make('price')
                    ->label('Price')
                    ->numeric()
                    ->prefix('$')
                    ->nullable(),

                DateTimePicker::make('accepted_at')
                    ->label('Accepted At')
                    ->nullable(),

                DateTimePicker::make('rejected_at')
                    ->label('Rejected At')
                    ->nullable(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('id')
                    ->label('ID')
                    ->sortable()
                    ->searchable(),

                TextColumn::make('placementRequest.cat.name')
                    ->label('Cat')
                    ->sortable()
                    ->searchable()
                    ->url(fn ($record) => $record->placementRequest?->cat ? route('filament.admin.resources.cats.edit', $record->placementRequest->cat) : null),

                TextColumn::make('helperProfile.user.name')
                    ->label('Helper')
                    ->sortable()
                    ->searchable()
                    ->url(fn ($record) => $record->helperProfile ? route('filament.admin.resources.helper-profiles.view', $record->helperProfile) : null),

                TextColumn::make('requester.name')
                    ->label('Requester')
                    ->sortable()
                    ->searchable(),

                BadgeColumn::make('requested_relationship_type')
                    ->label('Type')
                    ->colors([
                        'primary' => 'foster',
                        'success' => 'adopt',
                        'warning' => 'temporary',
                    ]),

                BadgeColumn::make('status')
                    ->label('Status')
                    ->colors([
                        'warning' => 'pending',
                        'success' => 'accepted',
                        'danger' => 'rejected',
                        'primary' => 'completed',
                        'secondary' => 'cancelled',
                    ]),

                TextColumn::make('price')
                    ->label('Price')
                    ->money('USD')
                    ->sortable(),

                TextColumn::make('accepted_at')
                    ->label('Response Date')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(),

                TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('updated_at')
                    ->label('Updated')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->options([
                        'pending' => 'Pending',
                        'accepted' => 'Accepted',
                        'rejected' => 'Rejected',
                        'completed' => 'Completed',
                        'cancelled' => 'Cancelled',
                    ]),

                SelectFilter::make('requested_relationship_type')
                    ->label('Request Type')
                    ->options([
                        'foster' => 'Foster',
                        'adopt' => 'Adopt',
                        'temporary' => 'Temporary Care',
                    ]),

                Tables\Filters\Filter::make('created_from')
                    ->form([
                        Forms\Components\DatePicker::make('created_from')
                            ->label('Created From'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['created_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('created_at', '>=', $date),
                            );
                    }),

                Tables\Filters\Filter::make('created_until')
                    ->form([
                        Forms\Components\DatePicker::make('created_until')
                            ->label('Created Until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['created_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('created_at', '<=', $date),
                            );
                    }),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                
                Action::make('approve')
                    ->label('Approve')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->visible(fn ($record) => $record->status === 'pending')
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $record->update([
                            'status' => 'accepted',
                            'accepted_at' => now(),
                        ]);
                        
                        Notification::make()
                            ->title('Transfer request approved')
                            ->success()
                            ->send();
                    }),

                Action::make('reject')
                    ->label('Reject')
                    ->icon('heroicon-o-x-mark')
                    ->color('danger')
                    ->visible(fn ($record) => $record->status === 'pending')
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $record->update([
                            'status' => 'rejected',
                            'rejected_at' => now(),
                        ]);
                        
                        Notification::make()
                            ->title('Transfer request rejected')
                            ->success()
                            ->send();
                    }),

                Action::make('complete')
                    ->label('Mark Complete')
                    ->icon('heroicon-o-check-circle')
                    ->color('primary')
                    ->visible(fn ($record) => $record->status === 'accepted')
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $record->update([
                            'status' => 'completed',
                        ]);
                        
                        Notification::make()
                            ->title('Transfer request marked as completed')
                            ->success()
                            ->send();
                    }),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                    
                    Tables\Actions\BulkAction::make('approve_selected')
                        ->label('Approve Selected')
                        ->icon('heroicon-o-check')
                        ->color('success')
                        ->requiresConfirmation()
                        ->action(function ($records) {
                            $count = 0;
                            foreach ($records as $record) {
                                if ($record->status === 'pending') {
                                    $record->update([
                                        'status' => 'accepted',
                                        'accepted_at' => now(),
                                    ]);
                                    $count++;
                                }
                            }
                            
                            Notification::make()
                                ->title("{$count} transfer requests approved")
                                ->success()
                                ->send();
                        }),

                    Tables\Actions\BulkAction::make('reject_selected')
                        ->label('Reject Selected')
                        ->icon('heroicon-o-x-mark')
                        ->color('danger')
                        ->requiresConfirmation()
                        ->action(function ($records) {
                            $count = 0;
                            foreach ($records as $record) {
                                if ($record->status === 'pending') {
                                    $record->update([
                                        'status' => 'rejected',
                                        'rejected_at' => now(),
                                    ]);
                                    $count++;
                                }
                            }
                            
                            Notification::make()
                                ->title("{$count} transfer requests rejected")
                                ->success()
                                ->send();
                        }),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\TransferHandoverRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListTransferRequests::route('/'),
            'create' => Pages\CreateTransferRequest::route('/create'),
            'view' => Pages\ViewTransferRequest::route('/{record}'),
            'edit' => Pages\EditTransferRequest::route('/{record}/edit'),
        ];
    }
}