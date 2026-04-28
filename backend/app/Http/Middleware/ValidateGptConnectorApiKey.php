<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Traits\ApiResponseTrait;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ValidateGptConnectorApiKey
{
    use ApiResponseTrait;

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $expectedApiKey = (string) config('services.gpt_connector.api_key', '');
        $providedApiKey = (string) $request->bearerToken();

        if ($expectedApiKey === '') {
            Log::warning('GPT connector API key is missing.');

            return $this->sendError('GPT connector is not configured.', 503);
        }

        if ($providedApiKey === '' || ! hash_equals($expectedApiKey, $providedApiKey)) {
            return $this->sendError('Unauthorized.', 401);
        }

        return $next($request);
    }
}
