<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\EmailConfiguration;
use App\Services\EmailConfigurationService;
use Illuminate\Console\Command;

class VerifyEmailConfigCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'email:verify-config {--test : Test the active configuration}';

    /**
     * The console command description.
     */
    protected $description = 'Verify email configuration status and optionally test connection';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('📧 Email Configuration Status');
        $this->info('================================');

        $activeConfig = EmailConfiguration::getActive();

        if (! $activeConfig) {
            $this->error('❌ No active email configuration found');
            $this->info('💡 Available configurations:');

            $configs = EmailConfiguration::all();
            if ($configs->isEmpty()) {
                $this->warn('   No email configurations exist');
                $this->info('   Run: php artisan db:seed --class=E2EEmailConfigurationSeeder');
            } else {
                foreach ($configs as $config) {
                    $status = $config->status->value;
                    $this->info("   - {$config->name} ({$config->provider}) - {$status}");
                }
            }

            return 1;
        }

        $this->info("✅ Active Configuration: {$activeConfig->name}");
        $this->info("   Provider: {$activeConfig->provider}");
        $this->info("   Status: {$activeConfig->status->value}");

        $config = $activeConfig->config;
        if ($activeConfig->provider === 'smtp') {
            $this->info("   SMTP Host: {$config['host']}:{$config['port']}");
            $this->info("   From: {$config['from_address']}");
            $this->info('   Encryption: '.($config['encryption'] ?: 'none'));
        }

        // Validate configuration
        $errors = $activeConfig->getValidationErrors();
        if (empty($errors)) {
            $this->info('✅ Configuration is valid');
        } else {
            $this->error('❌ Configuration has errors:');
            foreach ($errors as $error) {
                $this->error("   - {$error}");
            }
        }

        // Test connection if requested
        if ($this->option('test')) {
            $this->info('');
            $this->info('🔍 Testing email configuration...');

            try {
                $canConnect = app(EmailConfigurationService::class)
                    ->testConfiguration($activeConfig->provider, $activeConfig->config);

                if ($canConnect) {
                    $this->info('✅ Email configuration test successful');
                } else {
                    $this->error('❌ Email configuration test failed');
                }
            } catch (\Exception $e) {
                $this->error("❌ Test failed with error: {$e->getMessage()}");
            }
        }

        return 0;
    }
}
