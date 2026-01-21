<?php

declare(strict_types=1);

namespace App\Filament\Resources\PetResource\RelationManagers;

use App\Enums\PetRelationshipType;
use App\Models\PetRelationship;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class RelationshipsRelationManager extends RelationManager
{
    protected static string $relationship = 'relationships';

    protected static ?string $title = 'Pet Relationships';

    protected static ?string $recordTitleAttribute = 'id';

    public function form(Form $form): Form
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
                Tables\Actions\CreateAction::make()
                    ->label('Add Relationship')
                    ->mutateFormDataUsing(function (array $data): array {
                        $data['created_by'] = auth()->id();

                        return $data;
                    }),
                Tables\Actions\Action::make('transfer_ownership')
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
                        /** @var \App\Models\Pet $pet */
                        $pet = $livewire->getOwnerRecord();

                        // End current ownerships
                        $pet->relationships()
                            ->where('relationship_type', PetRelationshipType::OWNER->value)
                            ->whereNull('end_at')
                            ->update(['end_at' => $data['transfer_at']]);

                        // Create new ownership
                        $pet->relationships()->create([
                            'user_id' => $data['new_owner_id'],
                            'relationship_type' => PetRelationshipType::OWNER,
                            'start_at' => $data['transfer_at'],
                            'created_by' => auth()->id(),
                        ]);

                        Notification::make()
                            ->title('Ownership transferred successfully')
                            ->success()
                            ->send();
                    }),
            ])
            ->actions([
                Tables\Actions\Action::make('end_relationship')
                    ->label('End')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->visible(fn (PetRelationship $record) => $record->isActive())
                    ->action(function (PetRelationship $record): void {
                        $record->update(['end_at' => now()]);

                        Notification::make()
                            ->title('Relationship ended')
                            ->success()
                            ->send();
                    }),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }
}
