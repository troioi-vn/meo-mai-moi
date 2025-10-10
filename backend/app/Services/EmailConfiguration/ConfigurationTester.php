<?php

namespace App\Services\EmailConfiguration;

use App\Models\EmailConfiguration;
use Exception;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ConfigurationTester
{
    /**
     * Test an email configuration with detailed error information.
     */
    public function testConfiguration(?string $provider = null, ?array $config = null, ?string $testEmailAddress = null): array
    {
        try {
            $testConfig = $this->prepareTestConfiguration($provider, $config);

            if (!$testConfig['success']) {
                return $testConfig;
            }

            $validationResult = $this->validateConfiguration($testConfig['config']);

            if (!$validationResult['success']) {
                return $validationResult;
            }

            return $this->performConnectionTest($testConfig['config'], $testEmailAddress);
        } catch (Exception $e) {
            return $this->handleTestException($e, $provider);
        }
    }

    private function prepareTestConfiguration(?string $provider, ?array $config): array
    {
        if ($provider === null || $config === null) {
            $activeConfig = EmailConfiguration::getActive();

            if (!$activeConfig) {
                return [
                    'success' => false,
                    'error' => 'No active email configuration found',
                    'error_type' => 'configuration_missing',
                ];
            }

            $provider = $activeConfig->provider;
            $config = $activeConfig->config;
        }

        return [
            'success' => true,
            'config' => new EmailConfiguration([
                'provider' => $provider,
                'config' => $config,
            ]),
        ];
    }

    private function validateConfiguration(EmailConfiguration $testConfig): array
    {
        $validationErrors = $testConfig->validateConfig();

        if ($validationErrors) {
            return [
                'success' => false,
                'error' => 'Configuration validation failed: ' . implode(', ', $validationErrors),
                'error_type' => 'validation_failed',
                'validation_errors' => $validationErrors,
            ];
        }

        return ['success' => true];
    }

    private function performConnectionTest(EmailConfiguration $testConfig, ?string $testEmailAddress = null): array
    {
        $mailConfig = $testConfig->getMailConfig();
        $fromConfig = $testConfig->getFromAddress();
        $originalConfig = config('mail');

        try {
            $this->setupTestMailConfiguration($testConfig->provider, $mailConfig, $fromConfig);

            // Determine the recipient email address
            $recipientEmail = $testEmailAddress ?? $fromConfig['address'];

            $this->sendTestEmail($fromConfig, $recipientEmail);
            $this->restoreOriginalConfiguration($originalConfig);

            $this->logTestSuccess($testConfig->provider, $fromConfig, $recipientEmail);

            return [
                'success' => true,
                'message' => 'Test email sent successfully',
            ];
        } catch (Exception $e) {
            $this->restoreOriginalConfiguration($originalConfig);
            throw $e;
        }
    }

    private function setupTestMailConfiguration(string $provider, array $mailConfig, array $fromConfig): void
    {
        Config::set('mail.default', $provider);
        Config::set(
            "mail.mailers.{$provider}",
            $mailConfig['mailers'][$provider] ?? $mailConfig['mailers'][array_key_first($mailConfig['mailers'])]
        );
        Config::set('mail.from', $fromConfig);

        if (isset($mailConfig['services'])) {
            foreach ($mailConfig['services'] as $serviceName => $serviceConfig) {
                Config::set("services.{$serviceName}", $serviceConfig);
            }
        }

        app('mail.manager')->purge();
    }

    private function sendTestEmail(array $fromConfig, string $recipientEmail): void
    {
        Mail::raw('This is a test email to verify your email configuration.', function (Message $message) use ($recipientEmail) {
            $message->to($recipientEmail)
                ->subject('Email Configuration Test - ' . config('app.name'));
        });
    }

    private function restoreOriginalConfiguration(array $originalConfig): void
    {
        Config::set('mail', $originalConfig);
        app('mail.manager')->purge();
    }

    private function logTestSuccess(string $provider, array $fromConfig, string $recipientEmail): void
    {
        Log::info('Email configuration test successful', [
            'provider' => $provider,
            'from_address' => $fromConfig['address'],
            'recipient_email' => $recipientEmail,
        ]);
    }

    private function handleTestException(Exception $e, ?string $provider): array
    {
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

    private function getUserFriendlyErrorMessage(Exception $e, ?string $provider): string
    {
        $errorType = $this->categorizeEmailError($e);

        return match ($errorType) {
            'connection_failed' => "Unable to connect to the {$provider} server. Please check your host and port settings.",
            'authentication_failed' => 'Authentication failed. Please verify your username and password are correct.',
            'ssl_error' => 'SSL/TLS connection error. Please check your encryption settings and server certificates.',
            'mailgun_auth_failed' => 'Mailgun authentication failed. Please verify your API key is correct and active.',
            'mailgun_domain_error' => 'Mailgun domain error. Please verify your domain is correctly configured in Mailgun.',
            default => 'Email configuration test failed: ' . $e->getMessage()
        };
    }
}
