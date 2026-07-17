<?php

declare(strict_types=1);

namespace App\Http\Controllers\McpAuth;

use App\Http\Controllers\Controller;
use App\Services\McpConnectorService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DenyController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, McpConnectorService $service): JsonResponse
    {
        $validated = $request->validate(['request_ref' => ['required', 'string', 'max:4096']]);
        $payload = $service->parseAuthorizationReference($validated['request_ref']);
        if ($payload === null) {
            return $this->sendError('Invalid or expired authorization request.', 400);
        }
        if (! Cache::add('mcp_auth_request_used:'.$payload['request_id'], 1, now()->addMinutes(10))) {
            return $this->sendError('Authorization request has already been used.', 400);
        }

        return $this->sendSuccess([
            'redirect_url' => $service->callbackUrl($payload['request_id'], error: 'access_denied'),
        ]);
    }
}
