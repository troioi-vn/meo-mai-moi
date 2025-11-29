<?php

namespace App\Listeners;

use App\Enums\NotificationType;
use App\Events\HelperProfileStatusUpdated;
use App\Models\Notification;
use App\Services\NotificationService;

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
        $helperProfile = $event->getHelperProfile();
        $status = $helperProfile->approval_status;
        $message = "Your helper profile has been {$status}.";

        // Determine notification type based on status
        $notificationType = match ($status) {
            'approved' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            'rejected' => NotificationType::HELPER_RESPONSE_REJECTED->value,
            default => null,
        };

        // Send notification using NotificationService if we have a matching type
        if ($notificationType) {
            $user = $helperProfile->user; // ensure concrete User instance (avoid Model|null type)
            if ($user instanceof \App\Models\User) {
                $this->notificationService->send(
                    $user,
                    $notificationType,
                    [
                        'message' => $message,
                        'link' => '/account/helper-profile',
                        'helper_profile_id' => $helperProfile->id,
                        'status' => $status,
                    ]
                );
            }
        } else {
            // Fallback to direct notification creation for other statuses
            Notification::create([
                'user_id' => $helperProfile->user_id,
                'message' => $message,
                'link' => '/account/helper-profile',
            ]);
        }
    }
}
