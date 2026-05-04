<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\EmailConfigurationStatus;
use App\Exceptions\EmailConfigurationException;
use App\Models\EmailConfiguration;
use App\Services\EmailConfiguration\ConfigurationTester;
use App\Services\EmailConfiguration\MailConfigBuilder;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

class EmailConfigurationService
{
    private ConfigurationTester $tester;

    private MailConfigBuilder $mailConfigBuilder;

    public function __construct(?ConfigurationTester $tester = null, ?MailConfigBuilder $mailConfigBuilder = null)
    {
        $this->mailConfigBuilder = $mailConfigBuilder ?? new MailConfigBuilder;
        $this->tester = $tester ?? new ConfigurationTester($this->mailConfigBuilder);
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
        *
        * @param array<string, mixed> $config
     */
    public function createAndActivateConfiguration(string $provider, array $config): EmailConfiguration
    {
        try {
            // Validate the configuration first
            $emailConfig = new EmailConfiguration([
                'provider' => $provider,
                'config' => $config,
                'status' => EmailConfigurationStatus::INACTIVE,
            ]);

            $validationErrors = $emailConfig->validateConfig();
            if ($validationErrors) {
                throw new EmailConfigurationException(
                    'Configuration validation failed',
                    $validationErrors
                );
            }

            // Test the configuration before saving
            $testResult = $this->testConfigurationWithDetails($provider, $config);
            if (! $testResult['success']) {
                throw new EmailConfigurationException(
                    'Email configuration test failed',
                    [$testResult['error'] ?? 'Connection test failed. Please verify your settings.']
                );
            }

            // Save the new configuration
            $emailConfig = EmailConfiguration::create([
                'provider' => $provider,
                'config' => $config,
                'status' => EmailConfigurationStatus::INACTIVE,
            ]);

            $this->activateConfiguration($emailConfig);

            Log::info('Email configuration activated successfully', [
                'config_id' => $emailConfig->id,
                'provider' => $provider,
                'from_address' => $config['from_address'] ?? 'not set',
            ]);

            return $emailConfig;
        } catch (EmailConfigurationException $e) {
            Log::error('Email configuration setup failed', [
                'provider' => $provider,
                'errors' => $e->getValidationErrors(),
                'message' => $e->getMessage(),
            ]);
            throw $e;
        } catch (Exception $e) {
            Log::error('Unexpected error during email configuration setup', [
                'provider' => $provider,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw new EmailConfigurationException(
                'An unexpected error occurred while setting up email configuration',
                ['Please contact support if this issue persists.']
            );
        }
    }

    /**
     * Test an email configuration by attempting to send a test email.
        *
        * @param array<string, mixed>|null $config
     */
    public function testConfiguration(?string $provider = null, ?array $config = null): bool
    {
        $result = $this->testConfigurationWithDetails($provider, $config);

        return $result['success'];
    }

    /**
     * Test an email configuration with detailed error information.
        *
        * @param array<string, mixed>|null $config
        * @return array<string, mixed>
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
            // Log::debug('No valid active email configuration found. Email sending may not work.');

            return;
        }

        try {
            $mailConfig = $this->mailConfigBuilder->build($activeConfig);

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

            Log::debug('Mail configuration updated successfully', [
                'provider' => $activeConfig->provider,
                'from_address' => $mailConfig['from']['address'] ?? $mailConfig['from'] ?? 'not set',
            ]);
        } catch (Exception $e) {
            Log::error('Failed to update mail configuration', [
                'error' => $e->getMessage(),
                'config_id' => $activeConfig->id,
            ]);
            throw new \RuntimeException('Failed to update mail configuration: '.$e->getMessage());
        }
    }

    public function activateConfiguration(EmailConfiguration $configuration): void
    {
        $configuration->activate();
        $this->updateMailConfig();
    }

    /**
     * Deactivate the current email configuration.
     */
    public function deactivateConfiguration(?EmailConfiguration $configuration = null): void
    {
        $activeConfig = $configuration ?? $this->getActiveConfiguration();

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
     *
     * @return Collection<int, EmailConfiguration>
     */
    public function getAllConfigurations(): Collection
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
            $this->deactivateConfiguration($config);
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
        *
        * @return array<string, array{name: string, description: string, required_fields: list<string>, optional_fields: list<string>}>
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
