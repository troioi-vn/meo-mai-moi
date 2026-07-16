<?php

declare(strict_types=1);

namespace App\Traits;

use App\Models\Pet;
use App\Models\User;
use App\Services\PetAccessService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Laravel\Sanctum\PersonalAccessToken;

trait HandlesAuthentication
{
    /**
     * Resolve user from request, including bearer token fallback for optional auth routes.
     */
    protected function resolveUser(Request $request): ?User
    {
        /** @var User|null $user */
        $user = $request->user();

        // If no user and bearer token exists, try to resolve from token
        if (! $user && $request->bearerToken()) {
            $token = PersonalAccessToken::findToken($request->bearerToken());
            if ($token && $token->tokenable instanceof User) {
                $user = $token->tokenable;
                $request->setUserResolver(fn () => $user);
            }
        }

        return $user;
    }

    /**
     * Require authenticated user or return error response.
     */
    protected function requireAuth(Request $request): User
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
    protected function isOwner(?User $user, mixed $resource, string $ownerField = 'user_id'): bool
    {
        if (! $user || ! is_object($resource)) {
            return false;
        }

        // Special handling for Pet model with relationship-based ownership
        if ($resource instanceof Pet) {
            $isOwner = $this->petAccess()->isDirectOwner($user, $resource);
        } else {
            $isOwner = data_get($resource, $ownerField) === $user->id;
        }

        return $isOwner;
    }

    /**
     * Require user to be owner of resource.
     */
    protected function requireOwnerOrAdmin(Request $request, mixed $resource, string $ownerField = 'user_id'): User
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
    protected function requirePetOwner(Request $request, Pet $pet): User
    {
        $user = $this->requireAuth($request);

        if (! $this->petAccess()->isDirectOwner($user, $pet)) {
            abort(403, 'Forbidden.');
        }

        return $user;
    }

    /**
     * Require user to be pet owner or editor.
     */
    protected function requirePetEditorOrOwner(Request $request, Pet $pet): User
    {
        $user = $this->requireAuth($request);

        if (! $this->petAccess()->canEdit($user, $pet)) {
            abort(403, 'Forbidden.');
        }

        return $user;
    }

    /**
     * @deprecated Main-app pet resources no longer use admin-role shortcuts.
     *             Prefer requirePetEditorOrOwner(); kept temporarily for call-site migration.
     */
    protected function requirePetEditorOwnerOrAdmin(Request $request, Pet $pet): User
    {
        return $this->requirePetEditorOrOwner($request, $pet);
    }

    protected function petAccess(): PetAccessService
    {
        return app(PetAccessService::class);
    }

    /**
     * Authorize user for a specific action using Laravel's Gate system.
     */
    protected function authorizeUser(Request $request, string $ability, mixed $resource = null): ?User
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
     *
     * @param  string|array<string>  $roles
     */
    protected function hasRole(?User $user, string|array $roles): bool
    {
        if (! $user || ! method_exists($user, 'hasRole')) {
            return false;
        }

        return $user->hasRole($roles);
    }

    /**
     * Require user to have specific role(s) or return error response.
     *
     * @param  string|array<string>  $roles
     */
    protected function requireRole(Request $request, string|array $roles): User
    {
        $user = $this->requireAuth($request);

        if (! $this->hasRole($user, $roles)) {
            abort(403, 'Insufficient permissions.');
        }

        return $user;
    }
}
