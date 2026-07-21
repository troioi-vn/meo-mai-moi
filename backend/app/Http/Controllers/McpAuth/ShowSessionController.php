<?php

declare(strict_types=1);

namespace App\Http\Controllers\McpAuth;

use App\Http\Controllers\Controller;
use App\Services\McpConnectorService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShowSessionController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, McpConnectorService $service): JsonResponse
    {
        $validated = $request->validate(['request_ref' => ['required', 'string', 'max:4096']]);
        $payload = $service->parseAuthorizationReference($validated['request_ref']);
        if ($payload === null) {
            return $this->sendError('Invalid or expired authorization request.', 400);
        }

        return $this->sendSuccess([
            'client_name' => $payload['client_name'],
            'scopes' => $payload['scopes'],
            'expires_at' => $payload['exp'],
        ]);
    }
}
