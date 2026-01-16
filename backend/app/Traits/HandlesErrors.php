<?php

declare(strict_types=1);

namespace App\Traits;

use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Throwable;

trait HandlesErrors
{
    /**
     * Handle validation errors consistently.
     */
    protected function handleValidationError(ValidationException $e): JsonResponse
    {
        return response()->json([
            'message' => 'The given data was invalid.',
            'errors' => $e->errors(),
        ], 422);
    }

    /**
     * Handle general exceptions with consistent format.
     */
    protected function handleException(Throwable $e, string $defaultMessage = 'An error occurred', int $statusCode = 500): JsonResponse
    {
        // Log the exception for debugging
        \Log::error('Controller exception: '.$e->getMessage(), [
            'exception' => $e,
            'trace' => $e->getTraceAsString(),
        ]);

        return $this->sendError(
            config('app.debug') ? $e->getMessage() : $defaultMessage,
            $statusCode
        );
    }

    /**
     * Handle resource not found errors.
     */
    protected function handleNotFound(string $resource = 'Resource'): JsonResponse
    {
        return $this->sendError("{$resource} not found", 404);
    }

    /**
     * Handle unauthorized access errors.
     */
    protected function handleUnauthorized(string $message = 'Unauthorized'): JsonResponse
    {
        return $this->sendError($message, 401);
    }

    /**
     * Handle forbidden access errors.
     */
    protected function handleForbidden(string $message = 'Forbidden'): JsonResponse
    {
        return $this->sendError($message, 403);
    }

    /**
     * Handle business logic errors (like duplicate entries, invalid state).
     */
    protected function handleBusinessError(string $message, int $statusCode = 409): JsonResponse
    {
        return $this->sendError($message, $statusCode);
    }

    /**
     * Handle rate limiting errors.
     */
    protected function handleRateLimit(string $message = 'Rate limit exceeded'): JsonResponse
    {
        return $this->sendError($message, 429);
    }

    /**
     * Wrap controller actions with consistent error handling.
     */
    protected function handleAction(callable $action): JsonResponse
    {
        try {
            return $action();
        } catch (ValidationException $e) {
            return $this->handleValidationError($e);
        } catch (Throwable $e) {
            return $this->handleException($e);
        }
    }
}
