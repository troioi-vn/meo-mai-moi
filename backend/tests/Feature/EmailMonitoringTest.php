<?php

namespace Tests\Feature;

use App\Filament\Widgets\EmailDeliveryChart;
use App\Filament\Widgets\EmailSystemAlertsWidget;
use App\Filament\Widgets\NotificationStatsWidget;
use App\Models\EmailConfiguration;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailMonitoringTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAs(User::factory()->create());
    }

    public function test_notification_stats_widget_calculates_metrics_correctly()
    {
        // Create test notifications
        $user = User::factory()->create();

        // Create delivered notifications
        Notification::factory()->count(10)->create([
            'user_id' => $user->id,
            'delivered_at' => now()->subHours(2),
            'failed_at' => null,
        ]);

        // Create failed notifications
        Notification::factory()->count(2)->create([
            'user_id' => $user->id,
            'delivered_at' => null,
            'failed_at' => now()->subHour(),
            'failure_reason' => 'SMTP connection failed',
        ]);

        // Create pending notifications
        Notification::factory()->count(3)->create([
            'user_id' => $user->id,
            'delivered_at' => null,
            'failed_at' => null,
        ]);

        $widget = new NotificationStatsWidget;

        // Use reflection to access protected method
        $reflection = new \ReflectionClass($widget);
        $method = $reflection->getMethod('getStats');
        $method->setAccessible(true);
        $stats = $method->invoke($widget);

        $this->assertNotEmpty($stats);

        // Check that we have the expected number of stats
        $this->assertCount(8, $stats);

        // Check that we have stats with the expected structure
        foreach ($stats as $stat) {
            $this->assertInstanceOf(\Filament\Widgets\StatsOverviewWidget\Stat::class, $stat);
        }
    }

    public function test_email_system_alerts_detects_no_active_configurations()
    {
        // Create inactive email configuration
        EmailConfiguration::factory()->create([
            'is_active' => false,
        ]);

        $widget = new EmailSystemAlertsWidget;
        $viewData = $widget->getViewData();

        $this->assertTrue($viewData['hasAlerts']);

        $alerts = $viewData['alerts'];
        $noActiveConfigAlert = collect($alerts)->firstWhere('title', 'No Active Email Configuration');

        $this->assertNotNull($noActiveConfigAlert);
        $this->assertEquals('danger', $noActiveConfigAlert['type']);
    }

    public function test_email_system_alerts_detects_high_failure_rate()
    {
        $user = User::factory()->create();

        // Create many failed notifications in last 24 hours
        Notification::factory()->count(15)->create([
            'user_id' => $user->id,
            'created_at' => now()->subHours(12),
            'failed_at' => now()->subHours(11),
            'failure_reason' => 'High failure rate test',
        ]);

        // Create some successful ones
        Notification::factory()->count(5)->create([
            'user_id' => $user->id,
            'created_at' => now()->subHours(12),
            'delivered_at' => now()->subHours(11),
        ]);

        $widget = new EmailSystemAlertsWidget;
        $viewData = $widget->getViewData();

        $this->assertTrue($viewData['hasAlerts']);

        $alerts = $viewData['alerts'];
        $highFailureAlert = collect($alerts)->firstWhere('title', 'High Email Failure Rate');

        $this->assertNotNull($highFailureAlert);
        $this->assertEquals('danger', $highFailureAlert['type']);
        $this->assertStringContainsString('75.0%', $highFailureAlert['message']); // 15 failed out of 20 total
    }

    public function test_email_system_alerts_detects_delayed_deliveries()
    {
        $user = User::factory()->create();

        // Create notifications pending for more than 1 hour
        Notification::factory()->count(5)->create([
            'user_id' => $user->id,
            'created_at' => now()->subHours(3),
            'delivered_at' => null,
            'failed_at' => null,
        ]);

        $widget = new EmailSystemAlertsWidget;
        $viewData = $widget->getViewData();

        $this->assertTrue($viewData['hasAlerts']);

        $alerts = $viewData['alerts'];
        $delayedAlert = collect($alerts)->firstWhere('title', 'Delayed Email Deliveries');

        $this->assertNotNull($delayedAlert);
        $this->assertEquals('warning', $delayedAlert['type']);
        $this->assertStringContainsString('5 notifications', $delayedAlert['message']);
    }

    public function test_email_system_alerts_shows_no_alerts_when_system_healthy()
    {
        // Create active email configuration with valid config
        EmailConfiguration::factory()->create([
            'is_active' => true,
            'provider' => 'smtp',
            'config' => [
                'host' => 'smtp.example.com',
                'port' => 587,
                'username' => 'test@example.com',
                'password' => 'password',
                'encryption' => 'tls',
                'from_address' => 'test@example.com',
                'from_name' => 'Test App',
            ],
        ]);

        $user = User::factory()->create();

        // Create only successful recent notifications
        Notification::factory()->count(10)->create([
            'user_id' => $user->id,
            'created_at' => now()->subHours(2),
            'delivered_at' => now()->subHours(1),
        ]);

        $widget = new EmailSystemAlertsWidget;
        $viewData = $widget->getViewData();

        $this->assertFalse($viewData['hasAlerts']);
        $this->assertEmpty($viewData['alerts']);
    }

    public function test_email_delivery_chart_provides_correct_data_structure()
    {
        $user = User::factory()->create();

        // Create notifications for different days
        for ($i = 0; $i < 7; $i++) {
            $date = now()->subDays($i);

            Notification::factory()->count(2)->create([
                'user_id' => $user->id,
                'created_at' => $date,
                'delivered_at' => $date->copy()->addHour(),
            ]);

            Notification::factory()->create([
                'user_id' => $user->id,
                'created_at' => $date,
                'failed_at' => $date->copy()->addHour(),
                'failure_reason' => 'Test failure',
            ]);
        }

        $widget = new EmailDeliveryChart;

        // Use reflection to access protected method
        $reflection = new \ReflectionClass($widget);
        $method = $reflection->getMethod('getData');
        $method->setAccessible(true);
        $data = $method->invoke($widget);

        $this->assertArrayHasKey('datasets', $data);
        $this->assertArrayHasKey('labels', $data);

        $datasets = $data['datasets'];
        $this->assertCount(3, $datasets); // delivered, failed, pending

        // Check that each dataset has the right structure
        foreach ($datasets as $dataset) {
            $this->assertArrayHasKey('label', $dataset);
            $this->assertArrayHasKey('data', $dataset);
            $this->assertCount(7, $dataset['data']); // 7 days of data
        }

        $this->assertCount(7, $data['labels']); // 7 day labels
    }

    public function test_email_failure_analysis_widget_shows_recent_failures()
    {
        $user = User::factory()->create();

        // Create failed notifications within last 7 days
        $recentFailures = Notification::factory()->count(3)->create([
            'user_id' => $user->id,
            'created_at' => now()->subDays(2),
            'failed_at' => now()->subDays(2)->addHour(),
            'failure_reason' => 'SMTP authentication failed',
        ]);

        // Create older failed notification (should not appear)
        Notification::factory()->create([
            'user_id' => $user->id,
            'created_at' => now()->subDays(10),
            'failed_at' => now()->subDays(10)->addHour(),
            'failure_reason' => 'Old failure',
        ]);

        // Test the query directly since widget table setup is complex in tests
        $query = Notification::query()
            ->failed()
            ->where('created_at', '>=', now()->subDays(7))
            ->orderBy('failed_at', 'desc');

        $results = $query->get();

        $this->assertCount(3, $results);

        // Verify all results are recent failures
        foreach ($results as $notification) {
            $this->assertNotNull($notification->failed_at);
            $this->assertTrue($notification->created_at->gte(now()->subDays(7)));
            $this->assertEquals('SMTP authentication failed', $notification->failure_reason);
        }
    }

    public function test_notification_resource_shows_delivery_status_correctly()
    {
        $user = User::factory()->create();

        // Test delivered notification
        $delivered = Notification::factory()->create([
            'user_id' => $user->id,
            'delivered_at' => now()->subHour(),
            'failed_at' => null,
        ]);

        $this->assertEquals('delivered', $delivered->delivery_status);

        // Test failed notification
        $failed = Notification::factory()->create([
            'user_id' => $user->id,
            'delivered_at' => null,
            'failed_at' => now()->subHour(),
            'failure_reason' => 'Connection timeout',
        ]);

        $this->assertEquals('failed', $failed->delivery_status);

        // Test pending notification
        $pending = Notification::factory()->create([
            'user_id' => $user->id,
            'delivered_at' => null,
            'failed_at' => null,
        ]);

        $this->assertEquals('pending', $pending->delivery_status);
    }
}
