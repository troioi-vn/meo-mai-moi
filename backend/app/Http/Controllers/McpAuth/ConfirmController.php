<?php

declare(strict_types=1);

namespace App\Http\Controllers\McpAuth;

use App\Http\Controllers\Controller;
use App\Services\McpConnectorService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class ConfirmController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, McpConnectorService $service): JsonResponse
    {
        $validated = $request->validate(['request_ref' => ['required', 'string', 'max:4096']]);
        $payload = $service->parseAuthorizationReference($validated['request_ref']);
        if ($payload === null) {
            return $this->sendError('Invalid or expired authorization request.', 400);
        }

        $user = $request->user();
        if ($user->email_verified_at === null) {
            return $this->sendError('A verified email address is required.', 403);
        }
        if ($user->is_banned) {
            return $this->sendError('This account cannot authorize MCP clients.', 403);
        }
        if (! $service->isEmailAllowed((string) $user->email)) {
            return $this->sendError('This account is not allowed to use the development MCP connector.', 403);
        }
        if (! Cache::add('mcp_auth_request_used:'.$payload['request_id'], 1, now()->addMinutes(10))) {
            return $this->sendError('Authorization request has already been used.', 400);
        }

        $tokenName = 'mcp:'.Str::limit($payload['client_name'], 80, '');
        $plainTextToken = $user->createToken($tokenName, ['read'])->plainTextToken;
        $exchangeCode = Str::random(64);
        Cache::put('mcp_auth_code:'.hash('sha256', $exchangeCode), [
            'user_id' => $user->id,
            'sanctum_token' => $plainTextToken,
        ], now()->addMinutes(5));

        return $this->sendSuccess([
            'redirect_url' => $service->callbackUrl($payload['request_id'], $exchangeCode),
        ]);
    }
}
