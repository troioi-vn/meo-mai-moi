<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\SessionGuard;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Config;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Symfony\Component\HttpFoundation\Response;

class SanctumAuthenticateSession extends AuthenticateSession
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->hasSession() || ! $request->user()) {
            return parent::handle($request, $next);
        }

        $passwordHash = $request->user()->getAuthPassword();
        $hasPassword = is_string($passwordHash) && $passwordHash !== '';

        foreach (Arr::wrap(config('sanctum.guard')) as $driver) {
            $guard = $this->auth->guard($driver);

            if (! $guard instanceof SessionGuard) {
                continue;
            }

            $key = 'password_hash_'.$driver;
            $storedValue = $request->session()->get($key);

            // Preserve the existing cleanup for OAuth users and invalid markers.
            // Upstream can hash null now, but would reject a stale user's hash.
            if (! $hasPassword || ! is_string($storedValue) || $storedValue === '') {
                $request->session()->forget($key);
            } elseif ($this->isImpersonating($request)
                && ! $this->validatePasswordHash($guard, $passwordHash, $storedValue)) {
                // The impersonation switch can leave the previous user's marker.
                // Let upstream store the current user's hash after the request.
                $request->session()->forget($key);
            }
        }

        return $hasPassword ? parent::handle($request, $next) : $next($request);
    }

    protected function storePasswordHashInSession($request, string $guard): void
    {
        $passwordHash = $this->auth->guard($guard)->user()?->getAuthPassword();

        // The downstream request may have switched to a passwordless user.
        if (! is_string($passwordHash) || $passwordHash === '') {
            $request->session()->forget('password_hash_'.$guard);

            return;
        }

        parent::storePasswordHashInSession($request, $guard);
    }

    protected function isImpersonating(Request $request): bool
    {
        $sessionKey = Config::get('laravel-impersonate.session_key', 'impersonated_by');

        return is_string($sessionKey) && $sessionKey !== '' && $request->session()->has($sessionKey);
    }
}
