<?php

declare(strict_types=1);

namespace App\Http\Controllers\Notification;

use App\Events\NotificationRead;
use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Services\Notifications\Actions\NotificationActionRegistry;
use App\Traits\ApiResponseTrait;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ExecuteNotificationActionController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, Notification $notification, string $actionKey, NotificationActionRegistry $registry)
    {
        if ($notification->user_id !== Auth::id()) {
            return $this->sendError('Forbidden', 403);
        }

        try {
            $result = $registry->execute($notification, $actionKey, $request->user());
        } catch (AuthorizationException) {
            return $this->sendError('Forbidden', 403);
        } catch (ModelNotFoundException) {
            return $this->sendError('Not found', 404);
        } catch (\InvalidArgumentException $e) {
            return $this->sendError($e->getMessage(), 422);
        }

        if ($result->markRead && ! $notification->isRead()) {
            $notification->markAsRead();
        }

        $unreadBellCount = Notification::query()
            ->where('user_id', Auth::id())
            ->bellVisible()
            ->unread()
            ->count();

        // Treat a successful action as engagement.
        event(new NotificationRead((int) Auth::id(), (string) $notification->id, false, $unreadBellCount));

        return $this->sendSuccessWithMeta([
            'notification' => $this->toBellPayload($notification, $registry),
            'unread_bell_count' => $unreadBellCount,
        ], $result->message, 200);
    }

    /**
     * @return array<string, mixed>
     */
    private function toBellPayload(Notification $notification, NotificationActionRegistry $registry): array
    {
        return [
            'id' => (string) $notification->id,
            'level' => $notification->getBellLevel(),
            'title' => $notification->getBellTitle(),
            'body' => $notification->getBellBody(),
            'url' => $notification->link,
            'actions' => $registry->actionsFor($notification),
            'created_at' => $notification->created_at?->toISOString(),
            'read_at' => $notification->read_at?->toISOString(),
        ];
    }
}
