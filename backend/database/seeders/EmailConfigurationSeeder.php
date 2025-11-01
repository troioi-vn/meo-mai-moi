<?php

namespace Database\Seeders;

use App\Enums\EmailConfigurationStatus;
use App\Models\EmailConfiguration;
use Illuminate\Database\Seeder;

class EmailConfigurationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create sample SMTP configuration (disabled by default)
        EmailConfiguration::firstOrCreate(
            [
                'provider' => 'smtp',
            ],
            [
                'name' => 'SMTP Configuration',
                'description' => 'SMTP email configuration for dev.meo-mai-moi.com',
                'status' => EmailConfigurationStatus::INACTIVE,
                'config' => [
                    'host' => 'smtp.gmail.com',
                    'port' => 587,
                    'username' => 'your-email@gmail.com',
                    'password' => 'your-app-password',
                    'encryption' => 'tls',
                    'from_address' => 'mail@meo-mai-moi.com',
                    'from_name' => 'Meo Mai Moi',
                    'test_email_address' => 'pavel@catarchy.space',
                ],
            ]
        );

        // Create sample Mailgun configuration (disabled by default)
        EmailConfiguration::firstOrCreate(
            [
                'provider' => 'mailgun',
            ],
            [
                'name' => 'Mailgun Configuration',
                'description' => 'Mailgun API configuration for dev.meo-mai-moi.com',
                'status' => EmailConfigurationStatus::INACTIVE,
                'config' => [
                    'domain' => env('MAILGUN_DOMAIN', 'dev.meo-mai-moi.com'),
                    'api_key' => env('MAILGUN_SECRET', 'key-your-mailgun-api-key-here'),
                    'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
                    'webhook_signing_key' => env('MAILGUN_WEBHOOK_SIGNING_KEY'),
                    'from_address' => 'mail@meo-mai-moi.com',
                    'from_name' => 'Meo Mai Moi',
                    'test_email_address' => 'pavel@catarchy.space',
                ],
            ]
        );

        $this->command->info('Sample email configurations created (disabled by default).');
        $this->command->warn('Remember to update the email configurations with your actual credentials before activating them.');
    }
}
