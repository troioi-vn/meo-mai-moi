<?php

declare(strict_types=1);

namespace App\Traits;

use App\Models\Pet;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Laravel\Sanctum\PersonalAccessToken;

trait HandlesAuthentication
{
    /**
     * Resolve user from request, including bearer token fallback for optional auth routes.
     */
    protected function resolveUser(Request $request): ?Authenticatable
    {
        $user = $request->user();

        // If no user and bearer token exists, try to resolve from token
        if (! $user && $request->bearerToken()) {
            $token = PersonalAccessToken::findToken($request->bearerToken());
            if ($token && $token->tokenable instanceof Authenticatable) {
                $user = $token->tokenable;
                $request->setUserResolver(fn () => $user);
            }
        }

        return $user;
    }

    /**
     * Require authenticated user or return error response.
     */
    protected function requireAuth(Request $request): ?Authenticatable
    {
        $user = $this->resolveUser($request);

        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        return $user;
    }

    /**
     * Check if user is owner of a resource.
     */
    protected function isOwner($user, $resource, string $ownerField = 'user_id'): bool
    {
        if (! $user) {
            return false;
        }

        // Special handling for Pet model with new relationship system
        if ($resource instanceof Pet) {
            $isOwner = $resource->isOwnedBy($user);
        } else {
            $isOwner = $resource->{$ownerField} === $user->id;
        }

        return $isOwner;
    }

    /**
     * Require user to be owner of resource.
     */
    protected function requireOwnerOrAdmin(Request $request, $resource, string $ownerField = 'user_id'): ?Authenticatable
    {
        $user = $this->requireAuth($request);

        if (! $this->isOwner($user, $resource, $ownerField)) {
            abort(403, 'Forbidden.');
        }

        return $user;
    }

    /**
     * Require user to be pet owner.
     */
    protected function requirePetOwner(Request $request, Pet $pet): Authenticatable
    {
        $user = $this->requireAuth($request);

        if (! $pet->isOwnedBy($user)) {
            abort(403, 'Forbidden.');
        }

        return $user;
    }

    /**
     * Require user to be pet owner or editor.
     */
    protected function requirePetEditorOrOwner(Request $request, Pet $pet): Authenticatable
    {
        $user = $this->requireAuth($request);

        if (! $pet->canBeEditedBy($user)) {
            abort(403, 'Forbidden.');
        }

        return $user;
    }

    /**
     * Require user to be pet owner/editor or admin.
     */
    protected function requirePetEditorOwnerOrAdmin(Request $request, Pet $pet): Authenticatable
    {
        $user = $this->requireAuth($request);

        if ($this->hasRole($user, ['admin', 'super_admin']) || $pet->canBeEditedBy($user)) {
            return $user;
        }

        abort(403, 'Forbidden.');
    }

    /**
     * Authorize user for a specific action using Laravel's Gate system.
     */
    protected function authorizeUser(Request $request, string $ability, $resource = null): ?Authenticatable
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
    protected function requireRole(Request $request, $roles): ?Authenticatable
    {
        $user = $this->requireAuth($request);

        if (! $this->hasRole($user, $roles)) {
            abort(403, 'Insufficient permissions.');
        }

        return $user;
    }
}
