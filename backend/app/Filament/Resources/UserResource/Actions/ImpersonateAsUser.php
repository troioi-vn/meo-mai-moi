<?php

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
            ->icon('impersonate-icon')
            ->backTo(fn () => Filament::getCurrentPanel()->getUrl())
            ->redirectTo('/account')
            ->action(fn ($record) => $this->impersonate($record))
            ->hidden(fn ($record) => ! $this->canBeImpersonated($record));
    }
}
