<?php

namespace App\Filament\Resources\PetResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Section;
use Filament\Tables\Actions\Action;
use Filament\Notifications\Notification;
use App\Services\PetCapabilityService;

class PlacementRequestsRelationManager extends RelationManager
{
    protected static string $relationship = 'placementRequests';

    protected static ?string $title = 'Placement Requests';

    protected static ?string $recordTitleAttribute = 'id';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Section::make('Request Details')
                    ->schema([
                        Select::make('request_type')
                            ->label('Request Type')
                            ->options([
                                'fostering' => 'Fostering',
                                'adoption' => 'Adoption',
                                'permanent' => 'Permanent',
                                'foster_free' => 'Foster (Free)',
                            ])
                            ->required(),

                        Select::make('status')
                            ->label('Status')
                            ->options([
                                'active' => 'Active',
                                'fulfilled' => 'Fulfilled',
                                'canceled' => 'Canceled',
                            ])
                            ->required()
                            ->default('active'),

                        DatePicker::make('start_date')
                            ->label('Start Date')
                            ->nullable(),

                        DatePicker::make('end_date')
                            ->label('End Date')
                            ->nullable(),

                        Textarea::make('notes')
                            ->label('Notes')
                            ->rows(3)
                            ->columnSpanFull(),
                    ])
                    ->columns(2),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('id')
            ->columns([
                TextColumn::make('id')
                    ->label('ID')
                    ->sortable(),

                BadgeColumn::make('request_type')
                    ->label('Type')
                    ->colors([
                        'primary' => 'fostering',
                        'success' => 'adoption',
                        'warning' => 'permanent',
                        'info' => 'foster_free',
                    ]),

                BadgeColumn::make('status')
                    ->label('Status')
                    ->colors([
                        'success' => 'active',
                        'primary' => 'fulfilled',
                        'danger' => 'canceled',
                    ]),

                TextColumn::make('start_date')
                    ->label('Start Date')
                    ->date()
                    ->sortable(),

                TextColumn::make('end_date')
                    ->label('End Date')
                    ->date()
                    ->sortable(),

                TextColumn::make('transferRequests_count')
                    ->label('Responses')
                    ->counts('transferRequests')
                    ->alignCenter(),

                TextColumn::make('notes')
                    ->label('Notes')
                    ->limit(50)
                    ->tooltip(function (TextColumn $column): ?string {
                        $state = $column->getState();
                        if (strlen($state) <= 50) {
                            return null;
                        }
                        return $state;
                    }),

                TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('request_type')
                    ->options([
                        'fostering' => 'Fostering',
                        'adoption' => 'Adoption',
                        'permanent' => 'Permanent',
                        'foster_free' => 'Foster (Free)',
                    ]),

                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'active' => 'Active',
                        'fulfilled' => 'Fulfilled',
                        'canceled' => 'Canceled',
                    ]),
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make()
                    ->before(function ($data, $livewire) {
                        // Check if pet supports placement requests
                        $pet = $livewire->getOwnerRecord();
                        $capabilityService = app(PetCapabilityService::class);
                        
                        if (!$capabilityService->supports($pet, 'placement')) {
                            Notification::make()
                                ->title('Feature not available')
                                ->body('Placement requests are not available for this pet type.')
                                ->danger()
                                ->send();
                            return false; // Cancel the action
                        }
                    }),
            ])
            ->actions([
                Tables\Actions\ViewAction::make()
                    ->url(fn ($record) => route('filament.admin.resources.placement-requests.view', $record)),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),

                Action::make('fulfill')
                    ->label('Fulfill')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->visible(fn ($record) => $record->status === 'active')
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $record->update(['status' => 'fulfilled']);
                        
                        Notification::make()
                            ->title('Placement request fulfilled')
                            ->success()
                            ->send();
                    }),

                Action::make('cancel')
                    ->label('Cancel')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->visible(fn ($record) => $record->status === 'active')
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $record->update(['status' => 'canceled']);
                        
                        Notification::make()
                            ->title('Placement request canceled')
                            ->success()
                            ->send();
                    }),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }
}