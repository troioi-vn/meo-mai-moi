<?php

declare(strict_types=1);

namespace App\Filament\Resources\UserResource\Actions;

use Filament\Facades\Filament;
use Filament\Tables\Actions\Action;
use STS\FilamentImpersonate\Concerns\Impersonates;

class ImpersonateAsUser extends Action
{
    use Impersonates;

    protected function setUp(): void
    {
        parent::setUp();

        $this
            ->name('impersonate')
            ->label(__('Impersonate User'))
            ->iconButton()
            ->icon('heroicon-o-user')
            ->backTo(fn () => Filament::getCurrentPanel()->getUrl())
            ->redirectTo('/')
            ->action(fn ($record) => $this->impersonate($record))
            ->hidden(fn ($record) => ! $this->canBeImpersonated($record));
    }
}
