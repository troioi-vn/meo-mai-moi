<?php

declare(strict_types=1);

namespace App\Http\Controllers\Notification;

use App\Events\NotificationRead;
use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Response;

#[OA\Post(
    path: '/api/notifications/mark-all-read',
    tags: ['Notifications'],
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: false,
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'expected_unread_count', type: 'integer', minimum: 0),
        ])
    ),
    responses: [
        new OA\Response(response: 204, description: 'No Content'),
        new OA\Response(response: 409, description: 'Unread notification set changed'),
    ]
)]
class MarkAllNotificationsReadController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request): JsonResponse|Response
    {
        $validated = $request->validate([
            'expected_unread_count' => ['sometimes', 'required', 'integer', 'min:0'],
        ]);
        $result = DB::transaction(function () use ($validated): JsonResponse|int {
            $ids = Notification::query()
                ->where('user_id', Auth::id())
                ->bellVisible()
                ->unread()
                ->lockForUpdate()
                ->pluck('id');
            $currentCount = $ids->count();
            if (isset($validated['expected_unread_count'])
                && $currentCount !== (int) $validated['expected_unread_count']) {
                return response()->json([
                    'success' => false,
                    'data' => [
                        'expected_unread_count' => (int) $validated['expected_unread_count'],
                        'current_unread_count' => $currentCount,
                    ],
                    'message' => __('messages.offline.version_conflict'),
                    'error' => __('messages.offline.version_conflict'),
                ], 409);
            }

            Notification::query()->whereKey($ids)->update(['read_at' => now()]);

            return $currentCount;
        });
        if ($result instanceof JsonResponse) {
            return $result;
        }

        $unreadBellCount = Notification::query()
            ->where('user_id', Auth::id())
            ->bellVisible()
            ->unread()
            ->count();

        event(new NotificationRead((int) Auth::id(), null, true, $unreadBellCount));

        return $this->sendNoContent();
    }
}
