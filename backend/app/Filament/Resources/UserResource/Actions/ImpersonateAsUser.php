<?php

declare(strict_types=1);

namespace App\Filament\Resources\UserResource\Actions;

use App\Models\User;
use App\Services\Impersonation\ImpersonationHandoffService;
use Filament\Facades\Filament;
use Filament\Notifications\Notification;
use Illuminate\Http\RedirectResponse;
use STS\FilamentImpersonate\Actions\Impersonate;

/**
 * Starts an impersonation that has to cross a domain boundary.
 *
 * ADMIN_DOMAIN puts this panel on an internal hostname while the app answers on
 * the public one. They are different registrable domains, so the session the
 * package's own enter() builds here could never be sent to the app — and worse,
 * enter() forgets the current user from this session, which would log the
 * operator out of the panel they are standing in.
 *
 * So this never calls enter(). It mints a single-use handoff token and lets the
 * public app build the session on its own domain, leaving this panel session
 * untouched.
 */
class ImpersonateAsUser extends Impersonate
{
    protected function setUp(): void
    {
        parent::setUp();

        $this
            ->label(__('Impersonate User'))
            ->iconButton()
            ->icon('heroicon-o-user')
            // getCurrentPanel() is null outside a panel request; the handoff link
            // has to resolve anyway, so fall back to the configured admin URL.
            ->backTo(fn (): string => Filament::getCurrentOrDefaultPanel()?->getUrl() ?? admin_url());
    }

    public function impersonate($record): bool|RedirectResponse
    {
        if (! $this->canImpersonate($record)) {
            return false;
        }

        $impersonator = Filament::auth()->user();

        if (! $impersonator instanceof User || ! $record instanceof User) {
            return false;
        }

        $handoff = app(ImpersonationHandoffService::class)->issue(
            $impersonator,
            $record,
            $this->resolveBackToUrl(),
            $this->getGuard(),
            request()->ip(),
        );

        $target = frontend_url().'/api/impersonation/enter?'.http_build_query(['token' => $handoff['token']]);

        if ($this->getLivewire()) {
            // Never a SPA navigation: this leaves the panel's origin entirely.
            $this->redirect($target, navigate: false);

            return true;
        }

        return redirect()->away($target);
    }

    /**
     * Warn instead of failing silently when the panel has nowhere to send the operator.
     */
    protected function canImpersonate($target): bool
    {
        if (! parent::canImpersonate($target)) {
            return false;
        }

        if (frontend_url() === '') {
            Notification::make()
                ->title(__('filament-impersonate::action.failed'))
                ->body('FRONTEND_URL is not configured, so there is nowhere to hand the impersonation to.')
                ->danger()
                ->send();

            return false;
        }

        return true;
    }
}
