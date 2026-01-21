<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Console\Command;

class NotifySuperadmin extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'app:notify-superadmin 
                            {title : The notification title}
                            {body : The notification body}';

    /**
     * The console command description.
     */
    protected $description = 'Send an in-app notification to the superadmin user';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $title = $this->argument('title');
        $body = $this->argument('body');

        // Find the first superadmin user (based on SEED_ADMIN_EMAIL from env)
        $superadminEmail = config('seeder.admin_email', 'admin@catarchy.space');

        $superadmin = User::where('email', $superadminEmail)->first();

        if (! $superadmin) {
            // Try to find any user with superadmin role
            $superadmin = User::whereHas('roles', function ($query): void {
                $query->where('name', 'super_admin');
            })->first();
        }

        if (! $superadmin) {
            $this->error('Superadmin user not found');

            return self::FAILURE;
        }

        try {
            // Create notification directly using your custom Notification model
            Notification::create([
                'user_id' => $superadmin->id,
                'type' => 'deployment',
                'message' => $title, // Use title as the message (required field)
                'link' => null, // No specific link for deployment notifications
                'data' => [
                    'title' => $title,
                    'body' => $body,
                    'timestamp' => now()->toIso8601String(),
                ],
                'delivered_at' => now(), // Mark as delivered immediately
            ]);

            $this->info("Notification sent to {$superadmin->email}");

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Failed to send notification: {$e->getMessage()}");

            return self::FAILURE;
        }
    }
}
