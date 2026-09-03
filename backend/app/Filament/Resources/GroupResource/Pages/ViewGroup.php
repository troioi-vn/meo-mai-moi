<?php

declare(strict_types=1);

namespace App\Filament\Resources\GroupResource\Pages;

use App\Exceptions\GroupException;
use App\Filament\Resources\GroupResource;
use App\Models\Group;
use App\Services\Groups\GroupService;
use Filament\Actions;
use Filament\Forms\Components\TextInput;
use Filament\Infolists\Components\TextEntry;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ViewRecord;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

/**
 * @property Group $record
 */
class ViewGroup extends ViewRecord
{
    protected static string $resource = GroupResource::class;

    public function infolist(Schema $infolist): Schema
    {
        return $infolist->schema([
            Section::make('Group')
                ->schema([
                    TextEntry::make('name'),
                    TextEntry::make('creator.name')->label('Created by'),
                    TextEntry::make('created_at')->dateTime(),
                    TextEntry::make('updated_at')->dateTime(),
                ])
                ->columns(2),
        ]);
    }

    /**
     * @return list<Actions\Action>
     */
    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('rename_group')
                ->label('Rename')
                ->icon('heroicon-o-pencil-square')
                ->fillForm(fn (): array => ['name' => $this->record->name])
                ->form([
                    TextInput::make('name')
                        ->label('Name')
                        ->required()
                        ->maxLength(255),
                ])
                ->action(function (array $data): void {
                    /** @var Group $group */
                    $group = $this->record;

                    try {
                        app(GroupService::class)->updateAsModerator($group, $data['name']);
                        Notification::make()->title('Group renamed')->success()->send();
                    } catch (GroupException $exception) {
                        Notification::make()
                            ->title('Group could not be renamed')
                            ->body(__('groups.'.$exception->getMessage()))
                            ->danger()
                            ->send();
                    }
                }),
        ];
    }
}
