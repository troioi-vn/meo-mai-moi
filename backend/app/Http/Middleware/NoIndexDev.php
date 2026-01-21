<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Adds X-Robots-Tag: noindex, nofollow headers and serves a restrictive robots policy
 * for non-production environments or dev subdomains. This helps prevent crawling and
 * reduces the chance of Safe Browsing classification for test environments.
 */
class NoIndexDev
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $disallow = $this->shouldDisallowRobots($request);
        if ($disallow) {
            // Add X-Robots-Tag header for all responses (HTML, JSON, etc.)
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow', true);
        }

        return $response;
    }

    private function shouldDisallowRobots(Request $request): bool
    {
        // Allow enabling explicitly via env
        if (filter_var(config('app.disallow_robots', false), FILTER_VALIDATE_BOOL)) {
            return true;
        }

        // Consider any non-production environment as disallow
        if (! app()->environment('production')) {
            return true;
        }

        // Additionally, disallow for common dev/staging hostnames even in production env
        $host = $request->getHost();
        $devLike = ['dev.', 'staging.', 'test.', 'preview.'];
        foreach ($devLike as $prefix) {
            if (str_starts_with($host, $prefix)) {
                return true;
            }
        }

        return false;
    }
}
