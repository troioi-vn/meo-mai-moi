<?php

declare(strict_types=1);

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponseTrait
{
    public function sendSuccess(mixed $data, int $statusCode = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $data,
        ], $statusCode);
    }

    public function sendError(string $message, int $statusCode = 400): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'error' => $message,
        ], $statusCode);
    }

    public function sendSuccessWithMeta(mixed $data, ?string $message = null, int $statusCode = 200): JsonResponse
    {
        // If data is null and we have a message, wrap message in data to ensure frontend receives it
        // after the Axios interceptor unwraps the "data" envelope.
        if ($data === null && $message !== null) {
            $data = ['message' => $message];
        } elseif (is_array($data) && $message !== null && ! isset($data['message'])) {
            $data['message'] = $message;
        }

        $response = [
            'success' => true,
            'data' => $data,
        ];

        // Also keep it at top level for legacy support/tests
        if ($message) {
            $response['message'] = $message;
        }

        return response()->json($response, $statusCode);
    }
}
