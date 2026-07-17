<?php

declare(strict_types=1);

namespace App\Http\Controllers\McpAuth;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ExchangeController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate(['code' => ['required', 'string', 'size:64']]);
        $payload = Cache::pull('mcp_auth_code:'.hash('sha256', $validated['code']));
        if (! is_array($payload) || ! isset($payload['sanctum_token'], $payload['user_id'])) {
            return $this->sendError('Invalid or expired code.', 400);
        }

        return $this->sendSuccess([
            'sanctum_token' => (string) $payload['sanctum_token'],
            'user_id' => (int) $payload['user_id'],
        ]);
    }
}
