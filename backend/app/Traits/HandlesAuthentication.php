<?php

declare(strict_types=1);

namespace App\Traits;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Laravel\Sanctum\PersonalAccessToken;

trait HandlesAuthentication
{
    /**
     * Resolve user from request, including bearer token fallback for optional auth routes.
     */
    protected function resolveUser(Request $request): ?\Illuminate\Contracts\Auth\Authenticatable
    {
        $user = $request->user();

        // If no user and bearer token exists, try to resolve from token
        if (! $user && $request->bearerToken()) {
            $token = PersonalAccessToken::findToken($request->bearerToken());
            if ($token && $token->tokenable instanceof \Illuminate\Contracts\Auth\Authenticatable) {
                $user = $token->tokenable;
                $request->setUserResolver(fn () => $user);
            }
        }

        return $user;
    }

    /**
     * Require authenticated user or return error response.
     */
    protected function requireAuth(Request $request): ?\Illuminate\Contracts\Auth\Authenticatable
    {
        $user = $this->resolveUser($request);

        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        return $user;
    }

    /**
     * Check if user is owner of a resource or admin.
     */
    protected function isOwnerOrAdmin($user, $resource, string $ownerField = 'user_id'): bool
    {
        if (! $user) {
            return false;
        }

        // Special handling for Pet model with new relationship system
        if ($resource instanceof \App\Models\Pet) {
            $isOwner = $resource->isOwnedBy($user);
        } else {
            $isOwner = $resource->{$ownerField} === $user->id;
        }

        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);

        return $isOwner || $isAdmin;
    }

    /**
     * Require user to be owner of resource or admin, or return error response.
     */
    protected function requireOwnerOrAdmin(Request $request, $resource, string $ownerField = 'user_id'): ?\Illuminate\Contracts\Auth\Authenticatable
    {
        $user = $this->requireAuth($request);

        if (! $this->isOwnerOrAdmin($user, $resource, $ownerField)) {
            abort(403, 'Forbidden.');
        }

        return $user;
    }

    /**
     * Authorize user for a specific action using Laravel's Gate system.
     */
    protected function authorizeUser(Request $request, string $ability, $resource = null): ?\Illuminate\Contracts\Auth\Authenticatable
    {
        $user = $this->resolveUser($request);

        if ($user) {
            Gate::forUser($user)->authorize($ability, $resource);
        } else {
            Gate::authorize($ability, $resource);
        }

        return $user;
    }

    /**
     * Check if user has specific role(s).
     */
    protected function hasRole($user, $roles): bool
    {
        if (! $user || ! method_exists($user, 'hasRole')) {
            return false;
        }

        return $user->hasRole($roles);
    }

    /**
     * Require user to have specific role(s) or return error response.
     */
    protected function requireRole(Request $request, $roles): ?\Illuminate\Contracts\Auth\Authenticatable
    {
        $user = $this->requireAuth($request);

        if (! $this->hasRole($user, $roles)) {
            abort(403, 'Insufficient permissions.');
        }

        return $user;
    }
}
