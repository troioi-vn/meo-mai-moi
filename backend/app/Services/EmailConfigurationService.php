<?php

namespace App\Services;

use App\Models\EmailConfiguration;
use App\Services\EmailConfiguration\ConfigurationTester;
use Exception;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

class EmailConfigurationService
{
    private ConfigurationTester $tester;

    public function __construct(?ConfigurationTester $tester = null)
    {
        $this->tester = $tester ?? new ConfigurationTester();
    }

    /**
     * Get the currently active email configuration.
     */
    public function getActiveConfiguration(): ?EmailConfiguration
    {
        return EmailConfiguration::getActive();
    }

    /**
     * Create and activate a new email configuration.
     */
    public function createAndActivateConfiguration(string $provider, array $config): EmailConfiguration
    {
        try {
            // Validate the configuration first
            $emailConfig = new EmailConfiguration([
                'provider' => $provider,
                'config' => $config,
                'status' => \App\Enums\EmailConfigurationStatus::INACTIVE,
            ]);

            $validationErrors = $emailConfig->validateConfig();
            if ($validationErrors) {
                throw new \App\Exceptions\EmailConfigurationException(
                    'Configuration validation failed',
                    $validationErrors
                );
            }

            // Test the configuration before saving
            $testResult = $this->testConfigurationWithDetails($provider, $config);
            if (! $testResult['success']) {
                throw new \App\Exceptions\EmailConfigurationException(
                    'Email configuration test failed',
                    [$testResult['error'] ?? 'Connection test failed. Please verify your settings.']
                );
            }

            // Save the new configuration
            $emailConfig = EmailConfiguration::create([
                'provider' => $provider,
                'config' => $config,
                'status' => \App\Enums\EmailConfigurationStatus::INACTIVE,
            ]);

            // Activate the new configuration
            $emailConfig->activate();

            // Update the mail configuration
            $this->updateMailConfig();

            Log::info('Email configuration activated successfully', [
                'config_id' => $emailConfig->id,
                'provider' => $provider,
                'from_address' => $config['from_address'] ?? 'not set',
            ]);

            return $emailConfig;
        } catch (\App\Exceptions\EmailConfigurationException $e) {
            Log::error('Email configuration setup failed', [
                'provider' => $provider,
                'errors' => $e->getValidationErrors(),
                'message' => $e->getMessage(),
            ]);
            throw $e;
        } catch (\Exception $e) {
            Log::error('Unexpected error during email configuration setup', [
                'provider' => $provider,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw new \App\Exceptions\EmailConfigurationException(
                'An unexpected error occurred while setting up email configuration',
                ['Please contact support if this issue persists.']
            );
        }
    }

    /**
     * Test an email configuration by attempting to send a test email.
     */
    public function testConfiguration(?string $provider = null, ?array $config = null): bool
    {
        $result = $this->testConfigurationWithDetails($provider, $config);

        return $result['success'];
    }

    /**
     * Test an email configuration with detailed error information.
     */
    public function testConfigurationWithDetails(?string $provider = null, ?array $config = null, ?string $testEmailAddress = null): array
    {
        return $this->tester->testConfiguration($provider, $config, $testEmailAddress);
    }

    /**
     * Update Laravel's mail configuration with the active email configuration.
     */
    public function updateMailConfig(): void
    {
        $activeConfig = $this->getActiveConfiguration();

        if (! $activeConfig || ! $activeConfig->isValid()) {
            Log::warning('No valid active email configuration found. Email sending may not work.');

            return;
        }

        try {
            // Get mail configuration from the active config
            $mailConfig = $activeConfig->getMailConfig();

            // Update Laravel's mail configuration
            Config::set('mail.default', $mailConfig['default']);

            if (isset($mailConfig['mailers'])) {
                foreach ($mailConfig['mailers'] as $mailerName => $mailerConfig) {
                    Config::set("mail.mailers.{$mailerName}", $mailerConfig);
                }
            }

            if (isset($mailConfig['from'])) {
                Config::set('mail.from', $mailConfig['from']);
            }

            if (isset($mailConfig['services'])) {
                foreach ($mailConfig['services'] as $serviceName => $serviceConfig) {
                    Config::set("services.{$serviceName}", $serviceConfig);
                }
            }

            // Purge the mail manager to force reconfiguration
            app('mail.manager')->purge();

            Log::info('Mail configuration updated successfully', [
                'provider' => $activeConfig->provider,
                'from_address' => $mailConfig['from']['address'] ?? 'not set',
            ]);
        } catch (Exception $e) {
            Log::error('Failed to update mail configuration', [
                'error' => $e->getMessage(),
                'config_id' => $activeConfig->id,
            ]);
            throw new \RuntimeException('Failed to update mail configuration: '.$e->getMessage());
        }
    }

    /**
     * Deactivate the current email configuration.
     */
    public function deactivateConfiguration(): void
    {
        $activeConfig = $this->getActiveConfiguration();

        if ($activeConfig) {
            $activeConfig->deactivate();

            // Reset to default mail configuration
            Config::set('mail.default', config('mail.default'));
            app('mail.manager')->purge();

            Log::info('Email configuration deactivated', [
                'config_id' => $activeConfig->id,
            ]);
        }
    }

    /**
     * Get all email configurations.
     */
    public function getAllConfigurations(): \Illuminate\Database\Eloquent\Collection
    {
        return EmailConfiguration::orderBy('created_at', 'desc')->get();
    }

    /**
     * Delete an email configuration.
     */
    public function deleteConfiguration(int $configId): bool
    {
        $config = EmailConfiguration::find($configId);

        if (! $config) {
            return false;
        }

        // If this is the active configuration, deactivate it first
        if ($config->isActive()) {
            $this->deactivateConfiguration();
        }

        $config->delete();

        Log::info('Email configuration deleted', [
            'config_id' => $configId,
        ]);

        return true;
    }

    /**
     * Check if email sending is currently enabled and configured.
     */
    public function isEmailEnabled(): bool
    {
        $activeConfig = $this->getActiveConfiguration();

        return $activeConfig && $activeConfig->isValid();
    }

    /**
     * Get supported email providers.
     */
    public function getSupportedProviders(): array
    {
        return [
            'smtp' => [
                'name' => 'SMTP',
                'description' => 'Send emails using SMTP server',
                'required_fields' => ['host', 'port', 'username', 'password', 'encryption', 'from_address'],
                'optional_fields' => ['from_name', 'test_email_address'],
            ],
            'mailgun' => [
                'name' => 'Mailgun',
                'description' => 'Send emails using Mailgun API',
                'required_fields' => ['domain', 'api_key', 'from_address'],
                'optional_fields' => ['endpoint', 'from_name', 'test_email_address', 'webhook_signing_key'],
            ],
        ];
    }
}
