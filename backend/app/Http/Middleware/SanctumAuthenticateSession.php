<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\SessionGuard;
use Illuminate\Contracts\Auth\Factory as AuthFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\Response;

class SanctumAuthenticateSession
{
    /**
     * The authentication factory implementation.
     */
    protected AuthFactory $auth;

    public function __construct(AuthFactory $auth)
    {
        $this->auth = $auth;
    }

    /**
     * Handle an incoming request.
     *
     * This is based on Laravel Sanctum's AuthenticateSession middleware, but
     * guards against users that legitimately have a null password (e.g. OAuth)
     * and against impersonation where the session may still contain the previous
     * user's password hash.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->hasSession() || ! $request->user()) {
            return $next($request);
        }

        $guards = Collection::make(Arr::wrap(config('sanctum.guard')))
            ->mapWithKeys(fn ($guard) => [$guard => $this->auth->guard($guard)])
            ->filter(fn ($guard) => $guard instanceof SessionGuard);

        $passwordHash = $request->user()->getAuthPassword();

        // If the authenticated user has no password (null), we can't validate a
        // stored password hash. Clear any stale session values (common when
        // switching users during impersonation) and continue.
        if (! is_string($passwordHash) || $passwordHash === '') {
            foreach ($guards->keys() as $driver) {
                $request->session()->forget('password_hash_'.$driver);
            }

            return $next($request);
        }

        $shouldLogout = $guards
            ->filter(function ($guard, $driver) use ($request) {
                $storedValue = $request->session()->get('password_hash_'.$driver);

                if (! is_string($storedValue) || $storedValue === '') {
                    $request->session()->forget('password_hash_'.$driver);

                    return false;
                }

                return true;
            })
            ->filter(function ($guard, $driver) use ($passwordHash, $request) {
                $storedValue = $request->session()->get('password_hash_'.$driver);

                if (! is_string($storedValue) || $storedValue === '') {
                    return false;
                }

                return ! $this->validatePasswordHash($guard, $passwordHash, $storedValue);
            });

        if ($shouldLogout->isNotEmpty()) {
            $shouldLogout->each->logoutCurrentDevice();

            $request->session()->flush();

            throw new AuthenticationException('Unauthenticated.', [...$shouldLogout->keys()->all(), 'sanctum']);
        }

        return tap($next($request), function () use ($request, $guards): void {
            $guard = $this->getFirstGuardWithUser($guards->keys());

            if ($guard !== null) {
                $this->storePasswordHashInSession($request, $guard);
            }
        });
    }

    /**
     * Get the first authentication guard that has a user.
     */
    protected function getFirstGuardWithUser(Collection $guards): ?string
    {
        return $guards->first(function ($guard) {
            $guardInstance = $this->auth->guard($guard);

            return method_exists($guardInstance, 'hasUser') && $guardInstance->hasUser();
        });
    }

    /**
     * Store the user's current password hash in the session.
     */
    protected function storePasswordHashInSession(Request $request, string $guard): void
    {
        $guardInstance = $this->auth->guard($guard);

        $user = method_exists($guardInstance, 'user') ? $guardInstance->user() : null;
        $userPasswordHash = $user?->getAuthPassword();

        if (! is_string($userPasswordHash) || $userPasswordHash === '') {
            $request->session()->forget('password_hash_'.$guard);

            return;
        }

        $request->session()->put([
            "password_hash_{$guard}" => method_exists($guardInstance, 'hashPasswordForCookie')
                ? $guardInstance->hashPasswordForCookie($userPasswordHash)
                : $userPasswordHash,
        ]);
    }

    /**
     * Validate the password hash against the stored value.
     */
    protected function validatePasswordHash(SessionGuard $guard, string $passwordHash, string $storedValue): bool
    {
        // Try new HMAC format first (Laravel 12.45.0+)...
        if (method_exists($guard, 'hashPasswordForCookie')) {
            if (hash_equals($guard->hashPasswordForCookie($passwordHash), $storedValue)) {
                return true;
            }
        }

        // Fall back to raw password hash format for backward compatibility...
        return hash_equals($passwordHash, $storedValue);
    }
}
