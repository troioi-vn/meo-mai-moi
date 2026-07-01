<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Symfony\Component\HttpFoundation\Response;

class ThrottlePasswordResetRequests
{
    public function __construct(
        private readonly ThrottleRequests $throttleRequests,
    ) {}

    /**
     * Apply rate limiting only to Fortify's root password reset POST routes.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('POST') && $request->routeIs('password.email', 'password.update')) {
            return $this->throttleRequests->handle($request, $next, 6, 1);
        }

        return $next($request);
    }
}