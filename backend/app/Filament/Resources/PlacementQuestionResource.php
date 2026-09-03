<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Enums\PlacementQuestionStatus;
use App\Exceptions\PlacementQuestionException;
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

                static::approveAction(),
                static::hideAction(),
                static::unhideAction(),

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

    /**
     * Publish a pending question without answering it. The service owns the
     * transition; the resource only decides when the button is shown.
     */
    public static function approveAction(): Action
    {
        return Action::make('approve')
            ->label('Approve')
            ->icon('heroicon-o-check-circle')
            ->color('success')
            ->visible(fn (PlacementQuestion $record): bool => $record->status === PlacementQuestionStatus::PENDING)
            ->requiresConfirmation()
            ->modalHeading('Approve this question')
            ->modalDescription('This publishes the question on the public listing without an answer. The asker and their details stay exactly as they are.')
            ->action(function (PlacementQuestion $record): void {
                try {
                    app(PlacementQuestionService::class)->approve($record);
                } catch (PlacementQuestionException) {
                    Notification::make()
                        ->title('Could not approve')
                        ->body('This question is already published.')
                        ->danger()
                        ->send();

                    return;
                }

                Notification::make()
                    ->title('Question approved')
                    ->body('The question is now visible on the public listing.')
                    ->success()
                    ->send();
            });
    }

    /**
     * Withdraw a pending or published question from public view. Everything is
     * kept, so unhide can restore it later.
     */
    public static function hideAction(): Action
    {
        return Action::make('hide')
            ->label('Hide')
            ->icon('heroicon-o-eye-slash')
            ->color('warning')
            ->visible(fn (PlacementQuestion $record): bool => $record->status !== PlacementQuestionStatus::HIDDEN)
            ->requiresConfirmation()
            ->modalHeading('Hide this question')
            ->modalDescription('This removes the question from public view. The question, any answer, and the asker details are kept, so it can be unhidden later.')
            ->action(function (PlacementQuestion $record): void {
                app(PlacementQuestionService::class)->hide($record);

                Notification::make()
                    ->title('Question hidden')
                    ->body('The question is no longer visible on the public listing.')
                    ->success()
                    ->send();
            });
    }

    /**
     * Return a hidden question to wherever it came from. The service restores
     * published when the question was published before, pending otherwise.
     */
    public static function unhideAction(): Action
    {
        return Action::make('unhide')
            ->label('Unhide')
            ->icon('heroicon-o-eye')
            ->color('success')
            ->visible(fn (PlacementQuestion $record): bool => $record->status === PlacementQuestionStatus::HIDDEN)
            ->requiresConfirmation()
            ->modalHeading('Unhide this question')
            ->modalDescription('This returns the question to public view, or to the pending queue if it was never published.')
            ->action(function (PlacementQuestion $record): void {
                $question = app(PlacementQuestionService::class)->unhide($record);

                Notification::make()
                    ->title('Question unhidden')
                    ->body($question->status === PlacementQuestionStatus::PUBLISHED
                        ? 'The question is visible on the public listing again.'
                        : 'The question is back in the pending queue.')
                    ->success()
                    ->send();
            });
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
