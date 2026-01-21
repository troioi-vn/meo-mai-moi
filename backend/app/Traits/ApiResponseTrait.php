<?php

declare(strict_types=1);

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponseTrait
{
    public function sendSuccess(mixed $data, int $statusCode = 200): JsonResponse
    {
        return response()->json([
            'data' => $data,
        ], $statusCode);
    }

    public function sendError(string $message, int $statusCode = 400): JsonResponse
    {
        return response()->json([
            'error' => $message,
        ], $statusCode);
    }

    public function sendSuccessWithMeta(mixed $data, ?string $message = null, int $statusCode = 200): JsonResponse
    {
        $response = [
            'data' => $data,
        ];

        if ($message) {
            $response['message'] = $message;
        }

        return response()->json($response, $statusCode);
    }
}
