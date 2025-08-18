<?php

namespace App\Http\Controllers;

use App\Services\UnsubscribeService;
use App\Enums\NotificationType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\View\View;

class UnsubscribeController extends Controller
{
    protected UnsubscribeService $unsubscribeService;

    public function __construct(UnsubscribeService $unsubscribeService)
    {
        $this->unsubscribeService = $unsubscribeService;
    }

    /**
     * Show the unsubscribe page.
     */
    public function show(Request $request): View
    {
        $userId = $request->query('user');
        $notificationType = $request->query('type');
        $token = $request->query('token');

        // Validate parameters
        $isValid = $userId && $notificationType && $token;
        $notificationTypeEnum = null;
        
        if ($isValid) {
            $notificationTypeEnum = NotificationType::tryFrom($notificationType);
            $isValid = $notificationTypeEnum !== null;
        }

        return view('unsubscribe', [
            'isValid' => $isValid,
            'userId' => $userId,
            'notificationType' => $notificationType,
            'notificationTypeLabel' => $notificationTypeEnum?->getLabel(),
            'token' => $token,
        ]);
    }

    /**
     * Process the unsubscribe request.
     */
    public function unsubscribe(Request $request): JsonResponse
    {
        $request->validate([
            'user' => 'required|integer',
            'type' => 'required|string',
            'token' => 'required|string',
        ]);

        $success = $this->unsubscribeService->unsubscribe(
            $request->input('user'),
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