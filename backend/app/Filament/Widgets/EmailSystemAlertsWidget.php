<?php

namespace App\Filament\Widgets;

use App\Models\EmailConfiguration;
use App\Models\Notification;
use Filament\Widgets\Widget;
use Illuminate\Support\Facades\DB;

class EmailSystemAlertsWidget extends Widget
{
    protected static string $view = 'filament.widgets.email-system-alerts';

    protected static ?int $sort = 1;

    protected int|string|array $columnSpan = 'full';

    public function getViewData(): array
    {
        $alerts = $this->getSystemAlerts();

        return [
            'alerts' => $alerts,
            'hasAlerts' => count($alerts) > 0,
        ];
    }

    protected function getSystemAlerts(): array
    {
        $alerts = [];

        // Check for no active email configurations
        $activeConfigs = EmailConfiguration::active()->count();
        if ($activeConfigs === 0) {
            $alerts[] = [
                'type' => 'danger',
                'title' => 'No Active Email Configuration',
                'message' => 'No email configurations are currently active. Email delivery is disabled.',
                'action' => 'Configure Email',
                'action_url' => route('filament.admin.resources.email-configurations.index'),
            ];
        }

        // Check for high failure rate in last 24 hours
        $last24Hours = now()->subDay();
        $recentFailed = Notification::where('created_at', '>=', $last24Hours)->failed()->count();
        $recentTotal = Notification::where('created_at', '>=', $last24Hours)->count();

        if ($recentTotal > 10) { // Only alert if we have significant volume
            $failureRate = ($recentFailed / $recentTotal) * 100;
            if ($failureRate > 20) {
                $alerts[] = [
                    'type' => 'danger',
                    'title' => 'High Email Failure Rate',
                    'message' => sprintf(
                        'Email failure rate is %.1f%% in the last 24 hours (%d failed out of %d total).',
                        $failureRate,
                        $recentFailed,
                        $recentTotal
                    ),
                    'action' => 'View Failed Notifications',
                    'action_url' => route('filament.admin.resources.notifications.index', [
                        'tableFilters' => ['delivery_status' => ['value' => 'failed']],
                    ]),
                ];
            }
        }

        // Check for stuck email jobs in queue
        try {
            $stuckJobs = DB::table('jobs')
                ->where('payload', 'like', '%SendNotificationEmail%')
                // jobs.created_at is stored as an integer (Unix timestamp)
                // so compare using a Unix timestamp to avoid type errors on PostgreSQL
                ->where('created_at', '<', now()->subHours(2)->timestamp)
                ->count();

            if ($stuckJobs > 0) {
                $alerts[] = [
                    'type' => 'warning',
                    'title' => 'Stuck Email Jobs',
                    'message' => "There are {$stuckJobs} email jobs that have been queued for more than 2 hours.",
                    'action' => 'Check Queue Status',
                    'action_url' => '#', // Could link to queue monitoring if available
                ];
            }
        } catch (\Exception $e) {
            // Ignore if jobs table doesn't exist
        }

        // Check for notifications pending delivery for too long
        $oldPending = Notification::pending()
            ->where('created_at', '<', now()->subHours(1))
            ->count();

        if ($oldPending > 0) {
            $alerts[] = [
                'type' => 'warning',
                'title' => 'Delayed Email Deliveries',
                'message' => "There are {$oldPending} notifications pending delivery for more than 1 hour.",
                'action' => 'View Pending Notifications',
                'action_url' => route('filament.admin.resources.notifications.index', [
                    'tableFilters' => ['delivery_status' => ['value' => 'pending']],
                ]),
            ];
        }

        // Check for invalid email configurations
        $invalidConfigs = EmailConfiguration::active()
            ->get()
            ->filter(function ($config) {
                return ! $config->isValid();
            })
            ->count();

        if ($invalidConfigs > 0) {
            $alerts[] = [
                'type' => 'danger',
                'title' => 'Invalid Email Configurations',
                'message' => "There are {$invalidConfigs} active email configuration(s) with validation errors.",
                'action' => 'Review Email Configurations',
                'action_url' => route('filament.admin.resources.email-configurations.index'),
            ];
        }

        return $alerts;
    }
}
