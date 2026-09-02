<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Enums\PlacementQuestionStatus;
use App\Filament\Resources\PlacementQuestionResource\Pages;
use App\Models\PlacementQuestion;
use App\Services\Placement\PlacementQuestionService;
use Filament\Actions\Action;
use Filament\Actions\ViewAction;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

/**
 * The operational surface behind "email us and we will remove it".
 *
 * Askers are not users of this app: they have no account, no session, and by
 * design no self-service management link. That makes an admin able to find a
 * question by address and erase the person from it the only deletion path there
 * is, so it has to exist and it has to work.
 */
class PlacementQuestionResource extends Resource
{
    protected static ?string $model = PlacementQuestion::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-question-mark-circle';

    protected static string|\UnitEnum|null $navigationGroup = 'Pets data';

    protected static ?int $navigationSort = 6;

    protected static ?string $navigationLabel = 'Public Questions';

    protected static ?string $modelLabel = 'Public Question';

    protected static ?string $pluralModelLabel = 'Public Questions';

    protected static ?string $recordTitleAttribute = 'question';

    public static function form(Schema $form): Schema
    {
        return $form->schema([
            Section::make('Question')
                ->schema([
                    Forms\Components\TextInput::make('asker_name')->label('Asked by')->disabled(),
                    Forms\Components\TextInput::make('asker_email')->label('Email (never shown publicly)')->disabled(),
                    Forms\Components\Textarea::make('question')->rows(4)->disabled()->columnSpanFull(),
                ])
                ->columns(2),

            Section::make('Answer')
                ->schema([
                    Forms\Components\TextInput::make('answered_by_name')->label('Answered by')->disabled(),
                    Forms\Components\Textarea::make('answer')->rows(4)->disabled()->columnSpanFull(),
                ])
                ->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('pet.name')->label('Pet')->searchable()->sortable(),
                TextColumn::make('asker_name')->label('Asked by')->searchable(),
                TextColumn::make('asker_email')
                    ->label('Email')
                    ->searchable()
                    ->placeholder('none held')
                    ->toggleable(),
                TextColumn::make('question')->limit(60)->wrap(),
                TextColumn::make('status')->badge()->sortable(),
                IconColumn::make('asker_email_confirmed_at')
                    ->label('Confirmed')
                    ->boolean()
                    ->toggleable(),
                TextColumn::make('created_at')->label('Asked')->dateTime()->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')->options(
                    collect(PlacementQuestionStatus::cases())
                        ->mapWithKeys(fn (PlacementQuestionStatus $case): array => [$case->value => $case->getLabel()])
                        ->all()
                ),
            ])
            ->actions([
                ViewAction::make(),

                Action::make('forgetAsker')
                    ->label('Erase asker')
                    ->icon('heroicon-o-user-minus')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalHeading('Erase this person from the public Q&A')
                    ->modalDescription('Removes the name, email address and IP from every question this address asked. The questions and any answers stay, so published threads are not orphaned.')
                    ->visible(fn (PlacementQuestion $record): bool => $record->asker_email !== null)
                    ->action(function (PlacementQuestion $record): void {
                        $email = $record->asker_email;

                        if ($email === null) {
                            return;
                        }

                        $count = app(PlacementQuestionService::class)->forgetAsker($email);

                        Notification::make()
                            ->success()
                            ->title('Asker erased')
                            ->body("Removed identifying details from {$count} question(s).")
                            ->send();
                    }),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPlacementQuestions::route('/'),
            'view' => Pages\ViewPlacementQuestion::route('/{record}'),
        ];
    }

    public static function canCreate(): bool
    {
        // Questions come from the public API only; there is no reason for an
        // administrator to author one on somebody else's behalf.
        return false;
    }
}
