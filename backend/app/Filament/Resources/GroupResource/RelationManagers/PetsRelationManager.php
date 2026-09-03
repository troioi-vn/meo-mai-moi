<?php

declare(strict_types=1);

namespace App\Filament\Resources\GroupResource\RelationManagers;

use App\Exceptions\GroupException;
use App\Models\Group;
use App\Models\GroupPet;
use App\Services\Groups\GroupPetService;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PetsRelationManager extends RelationManager
{
    protected static string $relationship = 'groupPets';

    protected static ?string $title = 'Pets';

    public function form(Schema $form): Schema
    {
        return $form->schema([]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('pet.name')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('pet.petType.name')->label('Type')->searchable(),
                Tables\Columns\TextColumn::make('addedBy.name')->label('Added by')->searchable(),
                Tables\Columns\TextColumn::make('start_at')->dateTime()->sortable(),
                Tables\Columns\TextColumn::make('end_at')->dateTime()->placeholder('Active')->sortable(),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('active')
                    ->queries(
                        true: fn (Builder $query): Builder => $query->whereNull('end_at'),
                        false: fn (Builder $query): Builder => $query->whereNotNull('end_at'),
                    ),
            ])
            ->defaultSort('start_at', 'desc')
            ->actions([
                Actions\Action::make('end_assignment')
                    ->label('End assignment')
                    ->icon('heroicon-o-link-slash')
                    ->color('danger')
                    ->visible(fn (GroupPet $record): bool => $record->isActive())
                    ->requiresConfirmation()
                    ->modalHeading('End pet assignment')
                    ->modalDescription('This detaches the pet from this group. The pet record itself is kept and is not deleted.')
                    ->action(function (GroupPet $record): void {
                        try {
                            $pet = $record->pet;

                            if ($pet === null) {
                                throw GroupException::forbidden();
                            }

                            app(GroupPetService::class)->removePetAsModerator($this->group(), $pet);

                            Notification::make()->title('Pet assignment ended')->success()->send();
                        } catch (GroupException $exception) {
                            Notification::make()
                                ->title('Pet assignment could not be ended')
                                ->body(__('groups.'.$exception->getMessage()))
                                ->danger()
                                ->send();
                        }
                    }),
            ]);
    }

    private function group(): Group
    {
        $owner = $this->getOwnerRecord();

        if (! $owner instanceof Group) {
            throw new \LogicException('Group relation manager requires a group owner.');
        }

        return $owner;
    }
}
