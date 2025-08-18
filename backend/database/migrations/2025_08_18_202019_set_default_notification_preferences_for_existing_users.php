<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\User;
use App\Models\NotificationPreference;
use App\Enums\NotificationType;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Get all existing users who don't have notification preferences yet
        $users = User::whereDoesntHave('notificationPreferences')->get();

        foreach ($users as $user) {
            foreach (NotificationType::cases() as $notificationType) {
                NotificationPreference::firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'notification_type' => $notificationType->value,
                    ],
                    [
                        'email_enabled' => true,
                        'in_app_enabled' => true,
                    ]
                );
            }
        }

        // Also ensure any users who have partial preferences get the missing ones
        $allUsers = User::all();
        foreach ($allUsers as $user) {
            foreach (NotificationType::cases() as $notificationType) {
                NotificationPreference::firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'notification_type' => $notificationType->value,
                    ],
                    [
                        'email_enabled' => true,
                        'in_app_enabled' => true,
                    ]
                );
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration creates default data, so we don't need to reverse it
        // as it would remove user preferences that might have been customized
        // If needed, you could remove only the default preferences, but it's safer to leave them
    }
};
