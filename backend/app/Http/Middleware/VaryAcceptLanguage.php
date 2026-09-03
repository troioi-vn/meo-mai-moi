<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Advertises that API responses vary by Accept-Language.
 *
 * Locale resolution runs for every API request (SetLocaleMiddleware), so
 * shared caches must key on the header. Appends to an existing Vary value
 * without duplicating a token a controller already set itself.
 *
 * @param  Closure(Request): (Response)  $next
 */
class VaryAcceptLanguage
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $vary = (string) $response->headers->get('Vary', '');
        $tokens = array_values(array_filter(array_map('trim', explode(',', $vary))));

        foreach ($tokens as $token) {
            if ($token === '*') {
                return $response;
            }

            if (strcasecmp($token, 'Accept-Language') === 0) {
                return $response;
            }
        }

        $tokens[] = 'Accept-Language';
        $response->headers->set('Vary', implode(', ', $tokens));

        return $response;
    }
}
