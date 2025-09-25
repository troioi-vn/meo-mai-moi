<?php

namespace App\Services;

use App\Models\EmailConfiguration;
use Exception;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EmailConfigurationService
{
    /**
     * Get the currently active email configuration.
     */
    public function getActiveConfiguration(): ?EmailConfiguration
    {
        return EmailConfiguration::getActive();
    }

    /**
     * Set a new active email configuration.
     */
    public function setActiveConfiguration(string $provider, array $config): EmailConfiguration
    {
        try {
            // Validate the configuration first
            $emailConfig = new EmailConfiguration([
                'provider' => $provider,
                'config' => $config,
                'is_active' => false,
            ]);

            $validationErrors = $emailConfig->validateConfig();
            if (! empty($validationErrors)) {
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
                'is_active' => false,
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
    public function testConfigurationWithDetails(?string $provider = null, ?array $config = null): array
    {
        try {
            // If no parameters provided, test the active configuration
            if ($provider === null || $config === null) {
                $activeConfig = $this->getActiveConfiguration();
                if (! $activeConfig) {
                    return [
                        'success' => false,
                        'error' => 'No active email configuration found',
                        'error_type' => 'configuration_missing',
                    ];
                }
                $provider = $activeConfig->provider;
                $config = $activeConfig->config;
            }

            // Create a temporary EmailConfiguration instance for testing
            $testConfig = new EmailConfiguration([
                'provider' => $provider,
                'config' => $config,
            ]);

            // Validate configuration first
            $validationErrors = $testConfig->validateConfig();
            if (! empty($validationErrors)) {
                return [
                    'success' => false,
                    'error' => 'Configuration validation failed: '.implode(', ', $validationErrors),
                    'error_type' => 'validation_failed',
                    'validation_errors' => $validationErrors,
                ];
            }

            // Get mail configuration
            $mailConfig = $testConfig->getMailConfig();
            $fromConfig = $testConfig->getFromAddress();

            // Temporarily update mail configuration for testing
            $originalConfig = config('mail');

            try {
                // Set up test mail configuration
                Config::set('mail.default', $provider);
                Config::set("mail.mailers.{$provider}", $mailConfig['mailers'][$provider] ?? $mailConfig['mailers'][array_key_first($mailConfig['mailers'])]);
                Config::set('mail.from', $fromConfig);

                // Set services config for Mailgun
                if (isset($mailConfig['services'])) {
                    foreach ($mailConfig['services'] as $serviceName => $serviceConfig) {
                        Config::set("services.{$serviceName}", $serviceConfig);
                    }
                }

                // Purge the mail manager to force reconfiguration
                app('mail.manager')->purge();

                // Attempt to send a test email to the from address
                Mail::raw('This is a test email to verify your email configuration.', function (Message $message) use ($fromConfig) {
                    $message->to($fromConfig['address'])
                        ->subject('Email Configuration Test - '.config('app.name'));
                });

                // Restore original configuration
                Config::set('mail', $originalConfig);
                app('mail.manager')->purge();

                Log::info('Email configuration test successful', [
                    'provider' => $provider,
                    'from_address' => $fromConfig['address'],
                ]);

                return [
                    'success' => true,
                    'message' => 'Test email sent successfully',
                ];

            } catch (Exception $e) {
                // Restore original configuration in case of error
                Config::set('mail', $originalConfig);
                app('mail.manager')->purge();
                throw $e;
            }

        } catch (Exception $e) {
            $errorType = $this->categorizeEmailError($e);

            Log::error('Email configuration test failed', [
                'provider' => $provider,
                'error' => $e->getMessage(),
                'error_type' => $errorType,
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'error' => $this->getUserFriendlyErrorMessage($e, $provider),
                'error_type' => $errorType,
                'technical_error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Categorize email errors for better handling.
     */
    private function categorizeEmailError(Exception $e): string
    {
        $message = strtolower($e->getMessage());

        if (str_contains($message, 'connection') || str_contains($message, 'timeout')) {
            return 'connection_failed';
        }

        if (str_contains($message, 'authentication') || str_contains($message, 'login') || str_contains($message, 'password')) {
            return 'authentication_failed';
        }

        if (str_contains($message, 'ssl') || str_contains($message, 'tls') || str_contains($message, 'certificate')) {
            return 'ssl_error';
        }

        if (str_contains($message, 'mailgun') && str_contains($message, 'unauthorized')) {
            return 'mailgun_auth_failed';
        }

        if (str_contains($message, 'mailgun') && str_contains($message, 'domain')) {
            return 'mailgun_domain_error';
        }

        return 'unknown_error';
    }

    /**
     * Get user-friendly error messages based on error type.
     */
    private function getUserFriendlyErrorMessage(Exception $e, ?string $provider): string
    {
        $errorType = $this->categorizeEmailError($e);

        return match ($errorType) {
            'connection_failed' => "Unable to connect to the {$provider} server. Please check your host and port settings.",
            'authentication_failed' => 'Authentication failed. Please verify your username and password are correct.',
            'ssl_error' => 'SSL/TLS connection error. Please check your encryption settings and server certificates.',
            'mailgun_auth_failed' => 'Mailgun authentication failed. Please verify your API key is correct and active.',
            'mailgun_domain_error' => 'Mailgun domain error. Please verify your domain is correctly configured in Mailgun.',
            default => 'Email configuration test failed: '.$e->getMessage()
        };
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
            $activeConfig->update(['is_active' => false]);

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
        if ($config->is_active) {
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
                'optional_fields' => ['from_name'],
            ],
            'mailgun' => [
                'name' => 'Mailgun',
                'description' => 'Send emails using Mailgun API',
                'required_fields' => ['domain', 'api_key', 'from_address'],
                'optional_fields' => ['endpoint', 'from_name'],
            ],
        ];
    }
}
