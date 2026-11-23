<?php

declare(strict_types=1);

namespace App\Http\Controllers\McpAuth;

use App\Exceptions\McpAgentClientException;
use App\Http\Controllers\Controller;
use App\Services\McpAgentClientService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Server-to-server: the gateway forwards a client_credentials request here.
 * Every refusal is the same `invalid_client` so the caller learns nothing about
 * which part was wrong; the real reason goes to the log.
 */
class AgentTokenController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, McpAgentClientService $service): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => ['required', 'string', 'max:64'],
            'client_secret' => ['required', 'string', 'max:255'],
            'scopes' => ['sometimes', 'nullable', 'array'],
            'scopes.*' => ['string', 'max:64'],
        ]);

        try {
            $issued = $service->issueToken(
                $validated['client_id'],
                $validated['client_secret'],
                isset($validated['scopes']) ? array_values($validated['scopes']) : null,
            );
        } catch (McpAgentClientException $exception) {
            Log::info('MCP agent token refused.', ['reason' => $exception->getMessage()]);
            $error = $exception->getMessage() === 'invalid_scope' ? 'invalid_scope' : 'invalid_client';

            return $this->sendError($error, $error === 'invalid_scope' ? 400 : 401);
        }

        return $this->sendSuccess($issued);
    }
}
