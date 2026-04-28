<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Traits\ApiResponseTrait;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class RequireApiTokenAbility
{
    use ApiResponseTrait;

    /**
     * PAT abilities are a coarse capability gate for bearer-token clients.
     * Session-authenticated requests still rely on normal policies/ownership checks.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next, string $ability): Response
    {
        $bearerToken = $request->bearerToken();

        if (! is_string($bearerToken) || $bearerToken === '') {
            return $next($request);
        }

        $accessToken = PersonalAccessToken::findToken($bearerToken);

        if ($accessToken === null || $accessToken->can($ability)) {
            return $next($request);
        }

        $message = __('messages.api.token_ability_forbidden', [
            'ability' => $ability,
        ]);

        return $this->sendError($message, 403);
    }
}
