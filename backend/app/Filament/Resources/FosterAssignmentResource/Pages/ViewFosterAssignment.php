<?php

namespace App\Filament\Resources\FosterAssignmentResource\Pages;

use App\Filament\Resources\FosterAssignmentResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;
use Filament\Infolists\Infolist;
use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Components\Section;
use Filament\Infolists\Components\Grid;
use Filament\Support\Colors\Color;

class ViewFosterAssignment extends ViewRecord
{
    protected static string $resource = FosterAssignmentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make(),
            
            Actions\Action::make('complete')
                ->label('Mark Complete')
                ->icon('heroicon-o-check-circle')
                ->color('success')
                ->visible(fn () => $this->record->status === 'active')
                ->requiresConfirmation()
                ->action(function () {
                    $this->record->update([
                        'status' => 'completed',
                        'completed_at' => now(),
                    ]);
                    
                    $this->redirect($this->getResource()::getUrl('view', ['record' => $this->record]));
                }),

            Actions\Action::make('cancel')
                ->label('Cancel Assignment')
                ->icon('heroicon-o-x-circle')
                ->color('danger')
                ->visible(fn () => $this->record->status === 'active')
                ->requiresConfirmation()
                ->action(function () {
                    $this->record->update([
                        'status' => 'canceled',
                        'canceled_at' => now(),
                    ]);
                    
                    $this->redirect($this->getResource()::getUrl('view', ['record' => $this->record]));
                }),
        ];
    }

    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Section::make('Assignment Overview')
                    ->schema([
                        Grid::make(2)
                            ->schema([
                                TextEntry::make('cat.name')
                                    ->label('Cat')
                                    ->url(fn () => $this->record->cat ? route('filament.admin.resources.cats.edit', $this->record->cat) : null),
                                
                                TextEntry::make('fosterer.name')
                                    ->label('Foster Parent'),
                                
                                TextEntry::make('owner.name')
                                    ->label('Owner'),
                                
                                TextEntry::make('status')
                                    ->label('Status')
                                    ->badge()
                                    ->color(fn (string $state): string => match ($state) {
                                        'active' => 'success',
                                        'completed' => 'primary',
                                        'canceled' => 'danger',
                                        default => 'secondary',
                                    }),
                            ]),
                    ]),

                Section::make('Timeline')
                    ->schema([
                        Grid::make(2)
                            ->schema([
                                TextEntry::make('start_date')
                                    ->label('Start Date')
                                    ->date(),
                                
                                TextEntry::make('expected_end_date')
                                    ->label('Expected End Date')
                                    ->date(),
                                
                                TextEntry::make('completed_at')
                                    ->label('Completed At')
                                    ->dateTime()
                                    ->visible(fn () => $this->record->completed_at),
                                
                                TextEntry::make('canceled_at')
                                    ->label('Canceled At')
                                    ->dateTime()
                                    ->visible(fn () => $this->record->canceled_at),
                            ]),
                    ]),

                Section::make('Duration & Status')
                    ->schema([
                        Grid::make(3)
                            ->schema([
                                TextEntry::make('duration')
                                    ->label('Duration')
                                    ->getStateUsing(function () {
                                        if (!$this->record->start_date) {
                                            return 'Not started';
                                        }
                                        
                                        $endDate = $this->record->completed_at 
                                            ? $this->record->completed_at->toDateString()
                                            : ($this->record->canceled_at 
                                                ? $this->record->canceled_at->toDateString()
                                                : now()->toDateString());
                                        
                                        $start = \Carbon\Carbon::parse($this->record->start_date);
                                        $end = \Carbon\Carbon::parse($endDate);
                                        
                                        return $start->diffInDays($end) . ' days';
                                    }),
                                
                                TextEntry::make('days_remaining')
                                    ->label('Days Remaining')
                                    ->getStateUsing(function () {
                                        if ($this->record->status !== 'active' || !$this->record->expected_end_date) {
                                            return 'N/A';
                                        }
                                        
                                        $remaining = now()->diffInDays($this->record->expected_end_date, false);
                                        
                                        if ($remaining < 0) {
                                            return abs($remaining) . ' days overdue';
                                        }
                                        
                                        return $remaining . ' days';
                                    })
                                    ->color(function () {
                                        if ($this->record->status !== 'active' || !$this->record->expected_end_date) {
                                            return 'secondary';
                                        }
                                        
                                        $remaining = now()->diffInDays($this->record->expected_end_date, false);
                                        
                                        if ($remaining < 0) {
                                            return 'danger';
                                        } elseif ($remaining <= 7) {
                                            return 'warning';
                                        }
                                        
                                        return 'success';
                                    }),
                                
                                TextEntry::make('transfer_request.id')
                                    ->label('Related Transfer Request')
                                    ->url(fn () => $this->record->transferRequest ? route('filament.admin.resources.transfer-requests.view', $this->record->transferRequest) : null)
                                    ->visible(fn () => $this->record->transfer_request_id),
                            ]),
                    ]),

                Section::make('System Information')
                    ->schema([
                        Grid::make(2)
                            ->schema([
                                TextEntry::make('created_at')
                                    ->label('Created At')
                                    ->dateTime(),
                                
                                TextEntry::make('updated_at')
                                    ->label('Last Updated')
                                    ->dateTime(),
                            ]),
                    ])
                    ->collapsible(),
            ]);
    }
}