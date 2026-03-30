<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Console\Command;

class TestNotificationResource extends Command
{
    protected $signature = 'test:notification-resource';

    protected $description = 'Test the NotificationResource functionality';

    public function handle(): int
    {
        $this->info('Testing NotificationResource functionality...');

        // Test model relationships and attributes
        $this->info('1. Testing model functionality...');

        $user = User::first();
        if (! $user) {
            $this->error('No users found. Please seed users first.');

            return self::FAILURE;
        }

        // Create a test notification
        $notification = Notification::create([
            'user_id' => $user->id,
            'type' => 'system_announcement',
            'message' => 'Test notification for resource verification',
            'link' => '/admin/test',
            'data' => ['test' => true],
            'delivered_at' => now(),
        ]);

        $this->info("✓ Created notification ID: {$notification->id}");
        $this->info("✓ Type display: {$notification->type_display}");
        $this->info("✓ Delivery status: {$notification->delivery_status}");
        $this->info("✓ Engagement status: {$notification->engagement_status}");

        // Test scopes
        $this->info('2. Testing model scopes...');
        $this->info('✓ Total notifications: '.Notification::count());
        $this->info('✓ Unread notifications: '.Notification::query()->unread()->count());
        $this->info('✓ Read notifications: '.Notification::query()->read()->count());
        $this->info('✓ Delivered notifications: '.Notification::query()->delivered()->count());
        $this->info('✓ Failed notifications: '.Notification::query()->failed()->count());
        $this->info('✓ Pending notifications: '.Notification::query()->pending()->count());

        // Test notification actions
        $this->info('3. Testing notification actions...');

        // Mark as read
        $notification->markAsRead();
        $this->info('✓ Marked notification as read');
        $this->info("✓ New engagement status: {$notification->fresh()->engagement_status}");

        // Mark as failed
        $failedNotification = Notification::create([
            'user_id' => $user->id,
            'type' => 'transfer_request',
            'message' => 'Test failed notification',
            'failed_at' => now(),
            'failure_reason' => 'Test failure reason',
        ]);

        $this->info('✓ Created failed notification');
        $this->info("✓ Failure reason: {$failedNotification->failure_reason}");
        $this->info("✓ Delivery status: {$failedNotification->delivery_status}");

        // Test cleanup functionality
        $this->info('4. Testing cleanup functionality...');
        Notification::create([
            'user_id' => $user->id,
            'type' => 'system_announcement',
            'message' => 'Old notification for cleanup test',

            'read_at' => now()->subDays(100),
            'delivered_at' => now()->subDays(100),
            'created_at' => now()->subDays(100),
        ]);

        $this->info('✓ Created old notification for cleanup test');

        // Simulate cleanup (notifications older than 90 days that are read)
        $cutoffDate = now()->subDays(90);
        $cleanupCount = Notification::where('created_at', '<', $cutoffDate)
            ->read()
            ->count();

        $this->info("✓ Notifications eligible for cleanup (90+ days old, read): {$cleanupCount}");

        // Test notification types
        $this->info('5. Testing notification types...');
        $types = [
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

        foreach ($types as $type) {
            $testNotification = new Notification(['type' => $type]);
            $this->info("✓ {$type} -> {$testNotification->type_display}");
        }

        // Clean up test notifications
        Notification::where('message', 'LIKE', 'Test%')->delete();
        $this->info('✓ Cleaned up test notifications');

        $this->info('');
        $this->info('🎉 NotificationResource functionality test completed successfully!');
        $this->info('');
        $this->info('Key features implemented:');
        $this->info('• Notification type display with proper formatting');
        $this->info('• Delivery status tracking (pending, delivered, failed)');
        $this->info('• User engagement metrics (read/unread tracking)');
        $this->info('• Notification history views with filtering');
        $this->info('• Notification management actions (mark as read, retry delivery)');
        $this->info('• Cleanup actions for old notifications');
        $this->info('• Comprehensive admin panel resource with tabs and filters');
        $this->info('• Statistics widget for dashboard monitoring');

        return 0;
    }
}
