<?php

declare(strict_types=1);

namespace App\Http\Controllers\Impersonation;

use App\Exceptions\ImpersonationHandoffException;
use App\Services\Impersonation\ImpersonationHandoffService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use STS\FilamentImpersonate\ImpersonateManager;
use Symfony\Component\HttpFoundation\Response;

/**
 * The public half of the cross-domain impersonation handoff.
 *
 * The admin panel cannot hand its session to this domain, so it hands a
 * single-use token instead and this route builds the session here.
 */
class ConsumeImpersonationHandoffController
{
    public function __invoke(Request $request, ImpersonationHandoffService $handoff): Response|RedirectResponse
    {
        try {
            $result = $handoff->consume((string) $request->query('token', ''), $request->ip());
        } catch (ImpersonationHandoffException $e) {
            return response($this->messageFor($e), 403)
                ->header('Cache-Control', 'no-store, no-cache, must-revalidate');
        }

        $guard = $result['guard'];

        Auth::guard($guard)->login($result['target']);
        $request->session()->regenerate();

        // Order matters. Login fires an auth event that the impersonate package
        // listens for and answers by clearing the impersonation session keys, so
        // these have to be written after the login, never before it.
        $request->session()->put(ImpersonateManager::SESSION_KEY, $result['impersonator']->getAuthIdentifier());
        $request->session()->put(ImpersonateManager::SESSION_GUARD, $guard);
        $request->session()->put(ImpersonateManager::SESSION_GUARD_USING, $guard);
        $request->session()->put('impersonate.back_to', $result['back_to']);
        $request->session()->put('impersonate.audit_id', $result['audit']?->id);

        return redirect()->to((string) config('impersonation.landing_path', '/'));
    }

    private function messageFor(ImpersonationHandoffException $e): string
    {
        return match ($e->getMessage()) {
            'replayed_token' => 'This impersonation link has already been used. Start a new one from the admin panel.',
            'expired_token' => 'This impersonation link has expired. Start a new one from the admin panel.',
            'impersonator_not_allowed' => 'You are no longer allowed to impersonate.',
            'target_not_allowed' => 'This user can no longer be impersonated.',
            default => 'Invalid impersonation link.',
        };
    }
}
