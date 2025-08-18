<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\NotificationPreference;
use App\Enums\NotificationType;

class NotificationPreferenceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all existing users
        $users = User::all();

        // Create default notification preferences for all users
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

        $this->command->info('Default notification preferences created for ' . $users->count() . ' users.');
    }
}