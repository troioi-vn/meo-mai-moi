<?php

namespace App\Listeners;

use App\Events\HelperProfileStatusUpdated;
use App\Models\Notification;
use App\Services\NotificationService;
use App\Enums\NotificationType;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class CreateHelperProfileNotification
{
    protected NotificationService $notificationService;

    /**
     * Create the event listener.
     */
    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Handle the event.
     */
    public function handle(HelperProfileStatusUpdated $event): void
    {
        $status = $event->helperProfile->approval_status;
        $message = "Your helper profile has been {$status}.";

        // Determine notification type based on status
        $notificationType = match ($status) {
            'approved' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            'rejected' => NotificationType::HELPER_RESPONSE_REJECTED->value,
            default => null,
        };

        // Send notification using NotificationService if we have a matching type
        if ($notificationType) {
            $this->notificationService->send(
                $event->helperProfile->user,
                $notificationType,
                [
                    'message' => $message,
                    'link' => '/account/helper-profile',
                    'helper_profile_id' => $event->helperProfile->id,
                    'status' => $status,
                ]
            );
        } else {
            // Fallback to direct notification creation for other statuses
            Notification::create([
                'user_id' => $event->helperProfile->user_id,
                'message' => $message,
                'link' => '/account/helper-profile',
            ]);
        }
    }
}