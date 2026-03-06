<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\ApiRequestLog;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class LogApiRequest
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($request->isMethod('OPTIONS')) {
            return $response;
        }

        try {
            /** @var User|null $user */
            $user = Auth::guard('sanctum')->user();
            $hasBearerToken = is_string($request->bearerToken()) && $request->bearerToken() !== '';
            $authMode = 'none';

            if ($user instanceof User) {
                $authMode = $hasBearerToken ? 'pat' : 'session';
            }

            $userId = null;

            if ($user instanceof User && $user->exists && User::query()->whereKey($user->getKey())->exists()) {
                $userId = $user->getKey();
            }

            ApiRequestLog::query()->create([
                'user_id' => $userId,
                'method' => $request->getMethod(),
                'path' => $request->path(),
                'route_uri' => $request->route()?->uri(),
                'status_code' => $response->getStatusCode(),
                'auth_mode' => $authMode,
            ]);
        } catch (\Throwable $e) {
            // Logging must never break API responses.
            report($e);
        }

        return $response;
    }
}
