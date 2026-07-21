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
            $user = $request->user('sanctum') ?? Auth::guard('sanctum')->user();
            $hasBearerToken = is_string($request->bearerToken()) && $request->bearerToken() !== '';
            $authMode = 'none';

            if ($user instanceof User) {
                $authMode = $hasBearerToken ? 'pat' : 'session';
            }

            $userId = ($user instanceof User && $user->exists) ? $user->getKey() : null;
            $routeUri = $request->route()?->uri();
            $path = is_string($routeUri) && str_contains($routeUri, '{token}')
                ? $routeUri
                : $request->path();

            ApiRequestLog::query()->create([
                'user_id' => $userId,
                'method' => $request->getMethod(),
                'path' => $path,
                'route_uri' => $routeUri,
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
