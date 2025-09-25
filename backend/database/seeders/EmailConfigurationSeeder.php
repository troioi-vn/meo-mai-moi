<?php

namespace Database\Seeders;

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
                'is_active' => false,
                'config' => [
                    'host' => 'smtp.gmail.com',
                    'port' => 587,
                    'username' => 'your-email@gmail.com',
                    'password' => 'your-app-password',
                    'encryption' => 'tls',
                    'from_address' => 'noreply@meomaimoi.com',
                    'from_name' => 'Meo Mai Moi',
                ],
            ]
        );

        // Create sample Mailgun configuration (disabled by default)
        EmailConfiguration::firstOrCreate(
            [
                'provider' => 'mailgun',
            ],
            [
                'is_active' => false,
                'config' => [
                    'domain' => 'mg.meomaimoi.com',
                    'api_key' => 'key-your-mailgun-api-key-here',
                    'endpoint' => 'api.mailgun.net',
                    'from_address' => 'noreply@meomaimoi.com',
                    'from_name' => 'Meo Mai Moi',
                ],
            ]
        );

        $this->command->info('Sample email configurations created (disabled by default).');
        $this->command->warn('Remember to update the email configurations with your actual credentials before activating them.');
    }
}
