<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Traits\ApiResponseTrait;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ValidateMcpConnectorApiKey
{
    use ApiResponseTrait;

    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('services.mcp_connector.api_key', '');
        if ($expected === '') {
            Log::warning('MCP connector API key is missing.');

            return $this->sendError('MCP connector is not configured.', 503);
        }

        $provided = (string) $request->bearerToken();
        if ($provided === '' || ! hash_equals($expected, $provided)) {
            return $this->sendError('Unauthorized.', 401);
        }

        return $next($request);
    }
}
