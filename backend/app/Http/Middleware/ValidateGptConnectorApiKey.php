<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateGptConnectorApiKey
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $expectedApiKey = (string) config('services.gpt_connector.api_key', '');
        $providedApiKey = (string) $request->bearerToken();

        if ($expectedApiKey === '' || $providedApiKey === '' || ! hash_equals($expectedApiKey, $providedApiKey)) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Unauthorized.',
                'error' => 'Unauthorized.',
            ], 401);
        }

        return $next($request);
    }
}
