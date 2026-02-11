<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AppVersionHeader
{
    /**
     * Attach the current app version to every API response.
     *
     * Frontend reads this header to detect deploys and prompt a reload.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-App-Version', (string) config('version.api'));

        return $response;
    }
}
