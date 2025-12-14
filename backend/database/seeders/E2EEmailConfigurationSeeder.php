<?php

namespace Database\Seeders;

use App\Enums\EmailConfigurationStatus;
use App\Models\EmailConfiguration;
use Illuminate\Database\Seeder;

class E2EEmailConfigurationSeeder extends Seeder
{
    /**
     * Run the database seeds for E2E testing environment.
     * 
     * This seeder configures MailHog as the active email provider
     * for end-to-end testing with real email verification flows.
     */
    public function run(): void
    {
        // Deactivate any existing configurations first
        EmailConfiguration::query()->update(['status' => EmailConfigurationStatus::INACTIVE]);

        // Delete any existing MailHog configuration and create fresh
        EmailConfiguration::where('name', 'MailHog E2E Testing')->delete();
        
        // Create and activate MailHog SMTP configuration for E2E testing
        $mailhogConfig = EmailConfiguration::create([
            'provider' => 'smtp',
            'name' => 'MailHog E2E Testing',
            'description' => 'MailHog SMTP configuration for E2E testing with email verification',
            'status' => EmailConfigurationStatus::ACTIVE,
            'config' => [
                'host' => '127.0.0.1', // Use IP instead of localhost for validation
                'port' => 1025,
                'username' => 'mailhog', // MailHog accepts any username
                'password' => 'mailhog', // MailHog accepts any password
                'encryption' => null, // MailHog doesn't use encryption
                'from_address' => 'test@meomaimoi.local',
                'from_name' => 'Meo Mai Moi E2E Test',
                'test_email_address' => 'e2etest@example.com',
            ],
        ]);

        $this->command->info('✅ MailHog email configuration created and activated for E2E testing');
        $this->command->info('📧 Email settings:');
        $this->command->info('   - SMTP Host: localhost:1025');
        $this->command->info('   - From: test@meomaimoi.local');
        $this->command->info('   - MailHog UI: http://localhost:8025');
        $this->command->info('   - Status: ACTIVE');

        // Verify the configuration is valid
        if ($mailhogConfig->isValid()) {
            $this->command->info('✅ Configuration is valid and ready for E2E testing');
        } else {
            $this->command->error('❌ Configuration validation failed:');
            foreach ($mailhogConfig->getValidationErrors() as $error) {
                $this->command->error("   - {$error}");
            }
        }
    }
}