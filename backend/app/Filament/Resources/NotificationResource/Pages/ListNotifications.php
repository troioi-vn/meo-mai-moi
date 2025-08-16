<?php

namespace App\Filament\Resources\NotificationResource\Pages;

use App\Filament\Resources\NotificationResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;
use Filament\Resources\Components\Tab;
use Illuminate\Database\Eloquent\Builder;

class ListNotifications extends ListRecords
{
    protected static string $resource = NotificationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }

    public function getTabs(): array
    {
        return [
            'all' => Tab::make('All Notifications'),
            
            'unread' => Tab::make('Unread')
                ->modifyQueryUsing(fn (Builder $query) => $query->unread())
                ->badge(fn () => $this->getModel()::unread()->count())
                ->badgeColor('warning'),
            
            'read' => Tab::make('Read')
                ->modifyQueryUsing(fn (Builder $query) => $query->read())
                ->badge(fn () => $this->getModel()::read()->count())
                ->badgeColor('success'),
            
            'pending' => Tab::make('Pending Delivery')
                ->modifyQueryUsing(fn (Builder $query) => $query->pending())
                ->badge(fn () => $this->getModel()::pending()->count())
                ->badgeColor('warning'),
            
            'delivered' => Tab::make('Delivered')
                ->modifyQueryUsing(fn (Builder $query) => $query->delivered())
                ->badge(fn () => $this->getModel()::delivered()->count())
                ->badgeColor('success'),
            
            'failed' => Tab::make('Failed')
                ->modifyQueryUsing(fn (Builder $query) => $query->failed())
                ->badge(fn () => $this->getModel()::failed()->count())
                ->badgeColor('danger'),
        ];
    }
}