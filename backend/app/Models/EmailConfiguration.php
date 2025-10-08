<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailConfiguration extends Model
{
    use HasFactory;

    protected $fillable = [
        'provider',
        'name',
        'description',
        'is_active',
        'config',
    ];

    protected $casts = [
        'config' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Get the currently active email configuration.
     */
    public static function getActive(): ?self
    {
        return self::where('is_active', true)->first();
    }

    /**
     * Get display name for the configuration.
     */
    public function getDisplayName(): string
    {
        return $this->name ?: ($this->provider.' Configuration #'.$this->id);
    }

    /**
     * Activate this configuration and deactivate all others.
     */
    public function activate(): void
    {
        // Deactivate all other configurations
        self::where('id', '!=', $this->id)->update(['is_active' => false]);

        // Activate this configuration
        $this->update(['is_active' => true]);
    }

    /**
     * Get mail configuration array for Laravel mail config.
     */
    public function getMailConfig(): array
    {
        $config = $this->config;

        $result = match ($this->provider) {
            'smtp' => [
                'default' => 'smtp',
                'mailers' => [
                    'smtp' => [
                        'transport' => 'smtp',
                        'host' => $config['host'],
                        'port' => $config['port'],
                        'encryption' => $config['encryption'],
                        'username' => $config['username'],
                        'password' => $config['password'],
                        'timeout' => null,
                        'local_domain' => config('mail.mailers.smtp.local_domain'),
                    ],
                ],
                'from' => [
                    'address' => $config['from_address'],
                    'name' => $config['from_name'] ?? config('app.name'),
                ],
            ],
            'mailgun' => [
                'default' => 'mailgun',
                'mailers' => [
                    'mailgun' => [
                        'transport' => 'mailgun',
                    ],
                ],
                'services' => [
                    'mailgun' => [
                        'domain' => $config['domain'],
                        'secret' => $config['api_key'],
                        'endpoint' => $config['endpoint'] ?? 'api.mailgun.net',
                    ],
                ],
                'from' => [
                    'address' => $config['from_address'],
                    'name' => $config['from_name'] ?? config('app.name'),
                ],
            ],
            default => throw new \InvalidArgumentException("Unsupported email provider: {$this->provider}"),
        };

        // Provide flattened aliases for integration tests and convenience
        if ($this->provider === 'smtp') {
            $result['transport'] = 'smtp';
            $result['host'] = $config['host'];
            $result['port'] = $config['port'];
            $result['encryption'] = $config['encryption'];
        } elseif ($this->provider === 'mailgun') {
            $result['transport'] = 'mailgun';
            $result['domain'] = $config['domain'];
            $result['secret'] = $config['api_key'];
            $result['endpoint'] = $config['endpoint'] ?? 'api.mailgun.net';
        }

        return $result;
    }

    /**
     * Get the from address configuration.
     */
    public function getFromAddress(): array
    {
        $config = $this->config;

        return [
            'address' => $config['from_address'],
            'name' => $config['from_name'] ?? config('app.name'),
        ];
    }

    /**
     * Validate the configuration based on provider requirements.
     */
    public function validateConfig(): array
    {
        $errors = [];
        $config = $this->config;

        if (empty($this->provider)) {
            $errors[] = 'Email provider is required';

            return $errors;
        }

        switch ($this->provider) {
            case 'smtp':
                $errors = array_merge($errors, $this->validateSmtpConfig($config));
                break;

            case 'mailgun':
                $errors = array_merge($errors, $this->validateMailgunConfig($config));
                break;

            default:
                $errors[] = "Unsupported email provider: {$this->provider}. Supported providers are: smtp, mailgun";
        }

        return $errors;
    }

    /**
     * Validate SMTP configuration with detailed rules.
     */
    private function validateSmtpConfig(array $config): array
    {
        $errors = [];

        // Required fields validation
        $required = [
            'host' => 'SMTP host is required',
            'port' => 'SMTP port is required',
            'username' => 'SMTP username is required',
            'password' => 'SMTP password is required',
            'from_address' => 'From email address is required',
        ];

        foreach ($required as $field => $message) {
            if (empty($config[$field])) {
                $errors[] = $message;
            }
        }

        // Specific field validations
        if (! empty($config['port'])) {
            $port = (int) $config['port'];
            if ($port < 1 || $port > 65535) {
                $errors[] = 'SMTP port must be between 1 and 65535';
            }
        }

        if (isset($config['encryption']) && $config['encryption'] !== null && $config['encryption'] !== '' && ! in_array($config['encryption'], ['tls', 'ssl'])) {
            $errors[] = "SMTP encryption must be 'tls', 'ssl', or empty";
        }

        if (! empty($config['from_address']) && ! filter_var($config['from_address'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'From email address must be a valid email format';
        }

        if (! empty($config['host'])) {
            // Basic hostname validation
            if (! preg_match('/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $config['host']) &&
                ! filter_var($config['host'], FILTER_VALIDATE_IP)) {
                $errors[] = 'SMTP host must be a valid hostname or IP address';
            }
        }

        return $errors;
    }

    /**
     * Validate Mailgun configuration with detailed rules.
     */
    private function validateMailgunConfig(array $config): array
    {
        $errors = [];

        // Required fields validation
        $required = [
            'domain' => 'Mailgun domain is required',
            'api_key' => 'Mailgun API key is required',
            'from_address' => 'From email address is required',
        ];

        foreach ($required as $field => $message) {
            if (empty($config[$field])) {
                $errors[] = $message;
            }
        }

        // Specific field validations
        if (! empty($config['from_address']) && ! filter_var($config['from_address'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'From email address must be a valid email format';
        }

        if (! empty($config['domain'])) {
            // Basic domain validation
            if (! preg_match('/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $config['domain'])) {
                $errors[] = 'Mailgun domain must be a valid domain format';
            }
        }

        if (! empty($config['api_key'])) {
            // Basic API key format validation - should start with 'key-'
            if (! preg_match('/^key-[a-zA-Z0-9]+$/', $config['api_key'])) {
                $errors[] = "Mailgun API key must be in format 'key-' followed by alphanumeric characters";
            }
        }

        if (! empty($config['endpoint'])) {
            // Validate endpoint format
            if (! preg_match('/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $config['endpoint'])) {
                $errors[] = 'Mailgun endpoint must be a valid hostname';
            }
        }

        return $errors;
    }

    /**
     * Check if the configuration is valid.
     */
    public function isValid(): bool
    {
        return empty($this->validateConfig());
    }

    /**
     * Scope to get only active configurations.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get only inactive configurations.
     */
    public function scopeInactive($query)
    {
        return $query->where('is_active', false);
    }

    /**
     * Scope to get configurations for a specific provider.
     */
    public function scopeForProvider($query, string $provider)
    {
        return $query->where('provider', $provider);
    }

    /**
     * Check if this is an SMTP configuration.
     */
    public function isSmtp(): bool
    {
        return $this->provider === 'smtp';
    }

    /**
     * Check if this is a Mailgun configuration.
     */
    public function isMailgun(): bool
    {
        return $this->provider === 'mailgun';
    }

    /**
     * Get a specific configuration value.
     */
    public function getConfigValue(string $key, $default = null)
    {
        return $this->config[$key] ?? $default;
    }

    /**
     * Check if a configuration value exists.
     */
    public function hasConfigValue(string $key): bool
    {
        return array_key_exists($key, $this->config);
    }

    /**
     * Get user-friendly validation error messages.
     */
    public function getValidationErrors(): array
    {
        return $this->validateConfig();
    }

    /**
     * Get a summary of configuration issues for admin display.
     */
    public function getConfigurationSummary(): array
    {
        $errors = $this->validateConfig();
        $warnings = [];

        // Check for potential warnings
        if ($this->provider === 'smtp') {
            if (empty($this->config['from_name'])) {
                $warnings[] = "Consider setting a 'from name' for better email presentation";
            }

            if (empty($this->config['encryption']) || $this->config['encryption'] === null) {
                $warnings[] = 'Using unencrypted connection - consider using TLS or SSL';
            }
        }

        if ($this->provider === 'mailgun') {
            if (empty($this->config['from_name'])) {
                $warnings[] = "Consider setting a 'from name' for better email presentation";
            }

            if (empty($this->config['endpoint'])) {
                $warnings[] = 'Using default Mailgun endpoint - specify if using EU region';
            }
        }

        return [
            'errors' => $errors,
            'warnings' => $warnings,
            'is_valid' => empty($errors),
            'provider' => $this->provider,
            'from_address' => $this->config['from_address'] ?? 'Not set',
        ];
    }

    /**
     * Test if the configuration can establish a connection.
     */
    public function canConnect(): bool
    {
        if (! $this->isValid()) {
            return false;
        }

        try {
            $service = app(\App\Services\EmailConfigurationService::class);

            return $service->testConfiguration($this->provider, $this->config);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Configuration connection test failed', [
                'config_id' => $this->id,
                'provider' => $this->provider,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
