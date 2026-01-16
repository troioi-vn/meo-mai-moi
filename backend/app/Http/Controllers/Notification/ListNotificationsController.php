<?php

namespace App\Http\Controllers\Notification;

use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/notifications',
    tags: ['Notifications'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'status', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['all', 'unread'])),
    ],
    responses: [
        new OA\Response(response: 200, description: 'OK',
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'data', type: 'array',
                        items: new OA\Items(
                            properties: [
                                new OA\Property(property: 'id', type: 'string'),
                                new OA\Property(property: 'level', type: 'string', enum: ['info', 'success', 'warning', 'error']),
                                new OA\Property(property: 'title', type: 'string'),
                                new OA\Property(property: 'body', type: 'string', nullable: true),
                                new OA\Property(property: 'url', type: 'string', nullable: true),
                                new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
                                new OA\Property(property: 'read_at', type: 'string', format: 'date-time', nullable: true),
                            ]
                        )
                    ),
                ]
            )
        ),
    ]
)]
class ListNotificationsController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $status = $request->query('status', 'all');
        $query = Notification::where('user_id', Auth::id())
            // Hide email verification reminders from the bell menu
            ->where(function ($q) {
                $q->whereNull('type')
                    ->orWhere('type', '!=', NotificationType::EMAIL_VERIFICATION->value);
            })
            ->when($status === 'unread', function ($q) {
                $q->unread();
            })
            ->latest();

        $items = $query->get();

        // Map to frontend contract without altering DB schema yet
        $data = [];
        foreach ($items as $n) {
            // Extract title and body from data JSON if available
            $title = $n->data['title'] ?? $n->message;
            $body = $n->data['body'] ?? null;
            $level = $n->data['level'] ?? 'info';

            $data[] = [
                'id' => (string) $n->id,
                'level' => $level,
                'title' => $title,
                'body' => $body,
                'url' => $n->link,
                'created_at' => $n->created_at?->toISOString(),
                'read_at' => $n->read_at?->toISOString(),
            ];
        }

        return $this->sendSuccess($data);
    }
}
