<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\EmailConfiguration;
use Illuminate\Console\Command;

class SetupEmailConfigurations extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'email:setup 
                            {--smtp-username= : SMTP username (email)}
                            {--smtp-password= : SMTP password}
                            {--mailgun-api-key= : Mailgun API key}
                            {--activate= : Which provider to activate (smtp|mailgun)}';

    /**
     * The console command description.
     */
    protected $description = 'Set up email configurations for dev.meo-mai-moi.com with proper credentials';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Setting up email configurations for dev.meo-mai-moi.com...');

        // SMTP Configuration
        $smtpConfig = [
            'host' => 'smtp.gmail.com',
            'port' => 587,
            'username' => $this->option('smtp-username') ?: 'your-email@gmail.com',
            'password' => $this->option('smtp-password') ?: 'your-app-password',
            'encryption' => 'tls',
            'from_address' => 'mail@meo-mai-moi.com',
            'from_name' => 'Meo Mai Moi',
            'test_email_address' => 'pavel@catarchy.space',
        ];

        $smtp = EmailConfiguration::updateOrCreate(
            ['provider' => 'smtp'],
            [
                'name' => 'SMTP Configuration',
                'description' => 'SMTP email configuration for dev.meo-mai-moi.com',
                'is_active' => false,
                'config' => $smtpConfig,
            ]
        );

        $this->info('✓ SMTP configuration created/updated');

        // Mailgun Configuration
        $mailgunConfig = [
            'domain' => 'dev.meo-mai-moi.com',
            'api_key' => $this->option('mailgun-api-key') ?: 'key-your-mailgun-api-key-here',
            'endpoint' => 'api.mailgun.net',
            'from_address' => 'mail@meo-mai-moi.com',
            'from_name' => 'Meo Mai Moi',
            'test_email_address' => 'pavel@catarchy.space',
        ];

        $mailgun = EmailConfiguration::updateOrCreate(
            ['provider' => 'mailgun'],
            [
                'name' => 'Mailgun Configuration',
                'description' => 'Mailgun API configuration for dev.meo-mai-moi.com',
                'is_active' => false,
                'config' => $mailgunConfig,
            ]
        );

        $this->info('✓ Mailgun configuration created/updated');

        // Activate specified provider
        $activateProvider = $this->option('activate');
        if ($activateProvider) {
            if ($activateProvider === 'smtp') {
                $smtp->activate();
                $this->info('✓ SMTP configuration activated');
            } elseif ($activateProvider === 'mailgun') {
                $mailgun->activate();
                $this->info('✓ Mailgun configuration activated');
            } else {
                $this->error('Invalid provider. Use --activate=smtp or --activate=mailgun');

                return 1;
            }
        }

        $this->newLine();
        $this->info('Email configurations setup complete!');
        $this->newLine();

        $this->comment('Configuration details:');
        $this->line('• Domain: dev.meo-mai-moi.com');
        $this->line('• From Email: mail@meo-mai-moi.com');
        $this->line('• Test Email: pavel@catarchy.space');
        $this->newLine();

        if (! $this->option('smtp-username') || ! $this->option('smtp-password')) {
            $this->warn('Remember to update SMTP credentials:');
            $this->line('php artisan email:setup --smtp-username=your-email@gmail.com --smtp-password=your-app-password');
        }

        if (! $this->option('mailgun-api-key')) {
            $this->warn('Remember to update Mailgun API key:');
            $this->line('php artisan email:setup --mailgun-api-key=key-your-actual-api-key');
        }

        if (! $activateProvider) {
            $this->comment('To activate a configuration:');
            $this->line('php artisan email:setup --activate=smtp');
            $this->line('php artisan email:setup --activate=mailgun');
        }

        return 0;
    }
}
