<?php

namespace App\Listeners;

use App\Events\HelperProfileStatusUpdated;
use App\Models\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class CreateHelperProfileNotification
{
    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     */
    public function handle(HelperProfileStatusUpdated $event): void
    {
        $status = $event->helperProfile->approval_status;
        $message = "Your helper profile has been {$status}.";

        Notification::create([
            'user_id' => $event->helperProfile->user_id,
            'message' => $message,
            'link' => '/account/helper-profile',
        ]);
    }
}