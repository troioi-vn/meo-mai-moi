<?php

declare(strict_types=1);

namespace App\Filament\Resources\PetResource\RelationManagers;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Services\PetCapabilityService;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Actions\Action;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

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
                            ->options(PlacementRequestType::class)
                            ->required(),

                        Select::make('status')
                            ->label('Status')
                            ->options(PlacementRequestStatus::class)
                            ->required()
                            ->default(PlacementRequestStatus::OPEN->value),

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

                TextColumn::make('request_type')
                    ->label('Type')
                    ->badge(),

                TextColumn::make('status')
                    ->label('Status')
                    ->badge(),

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
                    ->options(PlacementRequestType::class),

                Tables\Filters\SelectFilter::make('status')
                    ->options(PlacementRequestStatus::class),
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make()
                    ->before(function ($data, $livewire) {
                        // Check if pet supports placement requests
                        $pet = $livewire->getOwnerRecord();
                        $capabilityService = app(PetCapabilityService::class);

                        if (! $capabilityService->supports($pet, 'placement')) {
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
                    ->visible(fn ($record) => $record->isActive())
                    ->requiresConfirmation()
                    ->action(function ($record): void {
                        $record->markAsFulfilled();

                        Notification::make()
                            ->title('Placement request fulfilled')
                            ->success()
                            ->send();
                    }),

                Action::make('cancel')
                    ->label('Cancel')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->visible(fn ($record) => $record->isActive())
                    ->requiresConfirmation()
                    ->action(function ($record): void {
                        $record->markAsCancelled();

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
