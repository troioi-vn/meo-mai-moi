<?php

declare(strict_types=1);

namespace App\Filament\Resources\PetResource\RelationManagers;

use App\Enums\PetRelationshipType;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\User;
use App\Services\LastOwnerRemovalException;
use App\Services\PetRelationshipService;
use Filament\Actions;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Notifications\Notification;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Support\Carbon;

class RelationshipsRelationManager extends RelationManager
{
    protected static string $relationship = 'relationships';

    protected static ?string $title = 'Pet Relationships';

    protected static ?string $recordTitleAttribute = 'id';

    public function form(Schema $form): Schema
    {
        return $form
            ->schema([
                Select::make('user_id')
                    ->relationship('user', 'name')
                    ->searchable()
                    ->preload()
                    ->required(),

                Select::make('relationship_type')
                    ->options(PetRelationshipType::class)
                    ->required(),

                DateTimePicker::make('start_at')
                    ->default(now())
                    ->required(),

                DateTimePicker::make('end_at')
                    ->nullable(),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('id')
            ->columns([
                TextColumn::make('user.name')
                    ->label('User')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('relationship_type')
                    ->label('Type')
                    ->badge(),

                TextColumn::make('start_at')
                    ->dateTime()
                    ->sortable(),

                TextColumn::make('end_at')
                    ->dateTime()
                    ->sortable()
                    ->placeholder('Active'),

                TextColumn::make('creator.name')
                    ->label('Created By')
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('relationship_type')
                    ->options(PetRelationshipType::class),
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Active Only')
                    ->queries(
                        true: fn ($query) => $query->whereNull('end_at'),
                        false: fn ($query) => $query->whereNotNull('end_at'),
                    ),
            ])
            ->headerActions([
                Actions\Action::make('add_relationship')
                    ->label('Add Relationship')
                    ->form([
                        Select::make('user_id')
                            ->relationship('user', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),
                        Select::make('relationship_type')
                            ->options(PetRelationshipType::class)
                            ->required(),
                        DateTimePicker::make('start_at')
                            ->default(now())
                            ->required(),
                    ])
                    ->action(function (RelationManager $livewire, array $data): void {
                        /** @var Pet $pet */
                        $pet = $livewire->getOwnerRecord();
                        /** @var User $actor */
                        $actor = auth()->user();
                        $user = User::findOrFail($data['user_id']);

                        app(PetRelationshipService::class)->assignRelationshipWithUpgrade(
                            $user,
                            $pet,
                            PetRelationshipType::from($data['relationship_type']),
                            $actor,
                            Carbon::parse($data['start_at']),
                        );
                    }),
                Actions\Action::make('transfer_ownership')
                    ->label('Transfer Ownership')
                    ->icon('heroicon-o-arrows-right-left')
                    ->color('warning')
                    ->form([
                        Select::make('new_owner_id')
                            ->label('New Owner')
                            ->relationship('user', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),
                        DateTimePicker::make('transfer_at')
                            ->label('Transfer Date')
                            ->default(now())
                            ->required(),
                    ])
                    ->action(function (RelationManager $livewire, array $data): void {
                        /** @var Pet $pet */
                        $pet = $livewire->getOwnerRecord();
                        /** @var User $actor */
                        $actor = auth()->user();
                        $newOwner = User::findOrFail($data['new_owner_id']);

                        app(PetRelationshipService::class)->transferAllOwnership(
                            $pet,
                            $newOwner,
                            $actor,
                            Carbon::parse($data['transfer_at']),
                        );

                        Notification::make()
                            ->title('Ownership transferred successfully')
                            ->success()
                            ->send();
                    }),
            ])
            ->actions([
                Actions\Action::make('end_relationship')
                    ->label('End')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->visible(fn (PetRelationship $record) => $record->isActive())
                    ->action(function (PetRelationship $record): void {
                        try {
                            app(PetRelationshipService::class)->endRelationshipSafely($record);
                        } catch (LastOwnerRemovalException) {
                            Notification::make()
                                ->title('The last owner cannot be removed')
                                ->danger()
                                ->send();

                            return;
                        }

                        Notification::make()
                            ->title('Relationship ended')
                            ->success()
                            ->send();
                    }),
            ]);
    }
}
