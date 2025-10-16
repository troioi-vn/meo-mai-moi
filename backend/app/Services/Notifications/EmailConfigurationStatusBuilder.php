<?php

namespace App\Services\Notifications;

use App\Services\EmailConfigurationService;
use Illuminate\Support\Facades\Log;

class EmailConfigurationStatusBuilder
{
    private EmailConfigurationService $emailConfigurationService;

    public function __construct(EmailConfigurationService $emailConfigurationService)
    {
        $this->emailConfigurationService = $emailConfigurationService;
    }

    /**
     * Get email configuration status with detailed information.
     */
    public function getStatus(): array
    {
        try {
            $activeConfig = $this->emailConfigurationService->getActiveConfiguration();

            if (! $activeConfig) {
                return $this->buildStatus(false, 'no_configuration', 'No email configuration found');
            }

            if (! $activeConfig->isValid()) {
                return $this->buildInvalidConfigStatus($activeConfig);
            }

            return $this->buildActiveConfigStatus($activeConfig);
        } catch (\Exception $e) {
            return $this->buildErrorStatus($e);
        }
    }

    private function buildStatus(bool $enabled, string $status, string $message, array $extra = []): array
    {
        return array_merge([
            'enabled' => $enabled,
            'status' => $status,
            'message' => $message,
        ], $extra);
    }

    private function buildInvalidConfigStatus($activeConfig): array
    {
        return $this->buildStatus(
            false,
            'invalid_configuration',
            'Email configuration is invalid',
            ['errors' => $activeConfig->validateConfig()]
        );
    }

    private function buildActiveConfigStatus($activeConfig): array
    {
        $testResult = $this->emailConfigurationService->testConfigurationWithDetails();

        return $this->buildStatus(
            $testResult['success'],
            $testResult['success'] ? 'ready' : 'connection_failed',
            $testResult['success'] ? 'Email system is ready' : $testResult['error'],
            [
                'provider' => $activeConfig->provider,
                'from_address' => $activeConfig->config['from_address'] ?? 'Not set',
            ]
        );
    }

    private function buildErrorStatus(\Exception $e): array
    {
        Log::error('Error checking email configuration status', [
            'error' => $e->getMessage(),
        ]);

        return $this->buildStatus(
            false,
            'error',
            'Error checking email configuration: '.$e->getMessage()
        );
    }
}
