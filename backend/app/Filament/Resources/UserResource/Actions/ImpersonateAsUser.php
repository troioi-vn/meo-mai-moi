<?php

declare(strict_types=1);

namespace App\Filament\Resources\UserResource\Actions;

use Filament\Facades\Filament;
use STS\FilamentImpersonate\Actions\Impersonate;

class ImpersonateAsUser extends Impersonate
{
    protected function setUp(): void
    {
        parent::setUp();

        $this
            ->label(__('Impersonate User'))
            ->iconButton()
            ->icon('heroicon-o-user')
            ->backTo(fn () => Filament::getCurrentPanel()->getUrl())
            ->redirectTo('/');
    }
}
