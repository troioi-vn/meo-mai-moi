<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponseTrait
{
    /**
     * @param  mixed  $data
     */
    public function sendSuccess($data, int $statusCode = 200): JsonResponse
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

    /**
     * @param  mixed  $data
     */
    public function sendSuccessWithMeta($data, ?string $message = null, int $statusCode = 200): JsonResponse
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
