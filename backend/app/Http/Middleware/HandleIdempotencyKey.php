<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Support\IdempotencyRequestFingerprint;
use App\Services\Offline\IdempotencyResult;
use App\Services\Offline\IdempotencyService;
use App\Services\Offline\IdempotencyState;
use App\Services\Offline\InvalidIdempotencyKeyException;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Opt-in middleware for offline-capable write endpoints.
 *
 * Register this middleware before authentication middleware so requests that
 * include an Idempotency-Key receive idempotency-specific error responses.
 *
 * Requests without an Idempotency-Key header pass through unchanged.
 * In-progress duplicates return HTTP 425 so clients can distinguish them from
 * payload conflicts (409).
 */
class HandleIdempotencyKey
{
    private const IN_PROGRESS_STATUS = 425;

    public function __construct(
        private readonly IdempotencyService $idempotencyService,
    ) {}

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $rawKey = $request->header('Idempotency-Key');
        if (! is_string($rawKey) || trim($rawKey) === '') {
            return $next($request);
        }

        $user = $request->user();
        if ($user === null) {
            return $this->errorResponse(__('messages.idempotency.unauthenticated'), 401);
        }

        try {
            $key = $this->idempotencyService->normalizeKey($rawKey);
        } catch (InvalidIdempotencyKeyException $exception) {
            return $this->errorResponse($exception->getMessage(), 422);
        }

        $fingerprint = IdempotencyRequestFingerprint::forRequest($request);
        $result = $this->idempotencyService->begin($user->id, $key, $fingerprint);

        return match ($result->state) {
            IdempotencyState::Replay => $this->replayResponse($result),
            IdempotencyState::Conflict => $this->errorResponse(__('messages.idempotency.conflict'), 409),
            IdempotencyState::InProgress => $this->errorResponse(__('messages.idempotency.in_progress'), self::IN_PROGRESS_STATUS),
            IdempotencyState::Reserved => $this->processReserved($request, $next, $user->id, $key),
        };
    }

    /**
     * @param  Closure(Request): (Response)  $next
     */
    private function processReserved(Request $request, Closure $next, int $userId, string $key): Response
    {
        try {
            $response = $next($request);
        } catch (Throwable $throwable) {
            $this->idempotencyService->abort($userId, $key);

            throw $throwable;
        }

        if ($this->isSuccessfulResponse($response) && $this->canStoreResponse($response)) {
            $this->storeCompletedResponse($userId, $key, $response);
        } else {
            $this->idempotencyService->abort($userId, $key);
        }

        return $response;
    }

    private function isSuccessfulResponse(Response $response): bool
    {
        $statusCode = $response->getStatusCode();

        return $statusCode >= 200 && $statusCode < 300;
    }

    private function canStoreResponse(Response $response): bool
    {
        if ($response->getStatusCode() === Response::HTTP_NO_CONTENT) {
            return true;
        }

        if (! str_contains(strtolower((string) $response->headers->get('Content-Type')), 'application/json')) {
            return false;
        }

        $decoded = json_decode($response->getContent(), true);

        return is_array($decoded);
    }

    private function storeCompletedResponse(int $userId, string $key, Response $response): void
    {
        if ($response->getStatusCode() === Response::HTTP_NO_CONTENT) {
            $this->idempotencyService->complete($userId, $key, Response::HTTP_NO_CONTENT, []);

            return;
        }

        /** @var array<string, mixed> $payload */
        $payload = json_decode($response->getContent(), true) ?? [];

        $this->idempotencyService->complete($userId, $key, $response->getStatusCode(), $payload);
    }

    private function replayResponse(IdempotencyResult $result): Response
    {
        $statusCode = $result->responseStatus ?? Response::HTTP_OK;

        if ($statusCode === Response::HTTP_NO_CONTENT) {
            return response()->noContent();
        }

        return response()->json($result->responsePayload ?? [], $statusCode);
    }

    private function errorResponse(string $message, int $statusCode): JsonResponse
    {
        return response()->json([
            'success' => false,
            'data' => null,
            'message' => $message,
            'error' => $message,
        ], $statusCode);
    }
}
