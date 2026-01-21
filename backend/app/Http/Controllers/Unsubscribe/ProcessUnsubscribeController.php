<?php

declare(strict_types=1);

namespace App\Http\Controllers\Unsubscribe;

use App\Http\Controllers\Controller;
use App\Services\UnsubscribeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Process the unsubscribe request.
 */
class ProcessUnsubscribeController extends Controller
{
    public function __construct(
        protected UnsubscribeService $unsubscribeService
    ) {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'user' => 'required|integer',
            'type' => 'required|string',
            'token' => 'required|string',
        ]);

        $success = $this->unsubscribeService->unsubscribe(
            (int) $request->input('user'),
            $request->input('type'),
            $request->input('token')
        );

        if ($success) {
            return response()->json([
                'success' => true,
                'message' => 'You have been successfully unsubscribed from this notification type.',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Invalid unsubscribe request. The link may be expired or invalid.',
        ], 400);
    }
}
