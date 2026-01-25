<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserNotBanned
{
    /**
     * Allow banned users to keep read-only access, but block all write methods.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // Safety valve: admins should still be able to recover/unban.
        if (method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin'])) {
            return $next($request);
        }

        $method = strtoupper($request->getMethod());
        $isReadOnlyMethod = in_array($method, ['GET', 'HEAD', 'OPTIONS'], true);
        // PATCH is a write operation and must be blocked for banned users.
        // We intentionally treat any non-safe HTTP method as a write.
        $isWriteMethod = in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true) || ! $isReadOnlyMethod;

        if ($user->is_banned && $isWriteMethod) {
            return response()->json([
                'error' => 'Your account is banned. Read-only access only.',
                'code' => 'USER_BANNED',
            ], 403);
        }

        return $next($request);
    }
}
