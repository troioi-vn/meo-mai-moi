<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class NotificationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = \App\Models\User::all();

        if ($users->isEmpty()) {
            $this->command->warn('No users found. Please seed users first.');

            return;
        }

        $notificationTypes = [
            'placement_request',
            'transfer_request',
            'transfer_accepted',
            'transfer_rejected',
            'handover_scheduled',
            'handover_completed',
            'review_received',
            'profile_approved',
            'profile_rejected',
            'system_announcement',
        ];

        $messages = [
            'placement_request' => 'A new placement request has been submitted for your review.',
            'transfer_request' => 'You have received a new transfer request.',
            'transfer_accepted' => 'Your transfer request has been accepted.',
            'transfer_rejected' => 'Your transfer request has been rejected.',
            'handover_scheduled' => 'A handover has been scheduled for your foster assignment.',
            'handover_completed' => 'The handover for your foster assignment has been completed.',
            'review_received' => 'You have received a new review.',
            'profile_approved' => 'Your helper profile has been approved.',
            'profile_rejected' => 'Your helper profile requires additional information.',
            'system_announcement' => 'Important system announcement: Please review the updated guidelines.',
        ];

        foreach ($users as $user) {
            // Create 5-15 notifications per user
            $notificationCount = rand(5, 15);

            for ($i = 0; $i < $notificationCount; $i++) {
                $type = $notificationTypes[array_rand($notificationTypes)];
                $createdAt = now()->subDays(rand(0, 30))->subHours(rand(0, 23));

                // Determine delivery status
                $deliveryRand = rand(1, 100);
                $delivered_at = null;
                $failed_at = null;
                $failure_reason = null;

                if ($deliveryRand <= 85) {
                    // 85% delivered successfully
                    $delivered_at = $createdAt->copy()->addMinutes(rand(1, 30));
                } elseif ($deliveryRand <= 95) {
                    // 10% failed delivery
                    $failed_at = $createdAt->copy()->addMinutes(rand(1, 30));
                    $failure_reasons = [
                        'User email not found',
                        'SMTP server timeout',
                        'Invalid email address',
                        'User has disabled notifications',
                        'Rate limit exceeded',
                    ];
                    $failure_reason = $failure_reasons[array_rand($failure_reasons)];
                }
                // 5% still pending (no delivered_at or failed_at)

                // Determine read status (only for delivered notifications)
                $is_read = false;
                $read_at = null;

                if ($delivered_at && rand(1, 100) <= 70) {
                    // 70% of delivered notifications are read
                    $is_read = true;
                    $read_at = $delivered_at->copy()->addMinutes(rand(5, 1440)); // Read within 1-24 hours
                }

                \App\Models\Notification::create([
                    'user_id' => $user->id,
                    'type' => $type,
                    'message' => $messages[$type],
                    'link' => rand(1, 100) <= 60 ? '/admin/some-resource/'.rand(1, 100) : null,
                    'data' => rand(1, 100) <= 30 ? [
                        'entity_id' => rand(1, 50),
                        'entity_type' => ['Cat', 'Transfer', 'PlacementRequest'][array_rand(['Cat', 'Transfer', 'PlacementRequest'])],
                        'priority' => ['low', 'medium', 'high'][array_rand(['low', 'medium', 'high'])],
                    ] : null,
                    'is_read' => $is_read,
                    'read_at' => $read_at,
                    'delivered_at' => $delivered_at,
                    'failed_at' => $failed_at,
                    'failure_reason' => $failure_reason,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
            }
        }

        $this->command->info('Notification seeder completed successfully.');
    }
}
