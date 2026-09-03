<?php

declare(strict_types=1);

namespace App\Filament\Resources\PlacementQuestionResource\Pages;

use App\Enums\PlacementQuestionStatus;
use App\Filament\Resources\PlacementQuestionResource;
use App\Models\PlacementQuestion;
use Filament\Resources\Pages\ListRecords;
use Filament\Schemas\Components\Tabs\Tab;
use Illuminate\Database\Eloquent\Builder;

class ListPlacementQuestions extends ListRecords
{
    protected static string $resource = PlacementQuestionResource::class;

    /**
     * @return array<string, Tab>
     */
    public function getTabs(): array
    {
        return [
            'all' => Tab::make('All questions'),

            'pending' => Tab::make('Pending review')
                ->modifyQueryUsing(fn (Builder $query): Builder => $query->where('status', PlacementQuestionStatus::PENDING))
                ->badge(fn (): int => PlacementQuestion::query()->where('status', PlacementQuestionStatus::PENDING)->count())
                ->badgeColor('warning'),

            'hidden' => Tab::make('Hidden')
                ->modifyQueryUsing(fn (Builder $query): Builder => $query->where('status', PlacementQuestionStatus::HIDDEN))
                ->badge(fn (): int => PlacementQuestion::query()->where('status', PlacementQuestionStatus::HIDDEN)->count())
                ->badgeColor('gray'),
        ];
    }
}
