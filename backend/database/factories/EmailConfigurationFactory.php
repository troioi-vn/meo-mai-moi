<?php

namespace Database\Factories;

use App\Enums\EmailConfigurationStatus;
use App\Models\EmailConfiguration;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\EmailConfiguration>
 */
class EmailConfigurationFactory extends Factory
{
    protected $model = EmailConfiguration::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $provider = $this->faker->randomElement(['smtp', 'mailgun']);

        return [
            'provider' => $provider,
            'name' => $this->faker->company().' Mail',
            'description' => $this->faker->sentence(),
            'status' => EmailConfigurationStatus::INACTIVE,
            'config' => $this->getConfigForProvider($provider),
        ];
    }

    /**
     * Generate configuration for SMTP provider.
     */
    public function smtp(): static
    {
        return $this->state(fn (array $attributes) => [
            'provider' => 'smtp',
            'config' => [
                'host' => $this->faker->randomElement(['smtp.gmail.com', 'smtp.outlook.com', 'smtp.yahoo.com']),
                'port' => $this->faker->randomElement([587, 465, 25]),
                'username' => $this->faker->email(),
                'password' => $this->faker->password(),
                'encryption' => $this->faker->randomElement(['tls', 'ssl']),
                'from_address' => $this->faker->email(),
                'from_name' => $this->faker->company(),
            ],
        ]);
    }

    /**
     * Generate configuration for Mailgun provider.
     */
    public function mailgun(): static
    {
        return $this->state(fn (array $attributes) => [
            'provider' => 'mailgun',
            'config' => [
                'domain' => 'mg.'.$this->faker->domainName(),
                'api_key' => 'key-'.$this->faker->regexify('[a-f0-9]{32}'),
                'endpoint' => $this->faker->randomElement(['api.mailgun.net', 'api.eu.mailgun.net']),
                'from_address' => $this->faker->email(),
                'from_name' => $this->faker->company(),
            ],
        ]);
    }

    /**
     * Mark configuration as active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => EmailConfigurationStatus::ACTIVE,
        ]);
    }

    /**
     * Mark configuration as inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => EmailConfigurationStatus::INACTIVE,
        ]);
    }

    /**
     * Mark configuration as draft.
     */
    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => EmailConfigurationStatus::DRAFT,
        ]);
    }

    /**
     * Generate a valid configuration.
     */
    public function valid(): static
    {
        return $this->state(fn (array $attributes) => [
            'config' => $this->getValidConfigForProvider($attributes['provider'] ?? 'smtp'),
        ]);
    }

    /**
     * Generate an invalid configuration (missing required fields).
     */
    public function invalid(): static
    {
        return $this->state(fn (array $attributes) => [
            'config' => $this->getInvalidConfigForProvider($attributes['provider'] ?? 'smtp'),
        ]);
    }

    /**
     * Get configuration for a specific provider.
     */
    private function getConfigForProvider(string $provider): array
    {
        return match ($provider) {
            'smtp' => [
                'host' => $this->faker->randomElement(['smtp.gmail.com', 'smtp.outlook.com']),
                'port' => 587,
                'username' => $this->faker->email(),
                'password' => $this->faker->password(),
                'encryption' => 'tls',
                'from_address' => $this->faker->email(),
                'from_name' => $this->faker->company(),
            ],
            'mailgun' => [
                'domain' => 'mg.'.$this->faker->domainName(),
                'api_key' => 'key-'.$this->faker->regexify('[a-f0-9]{32}'),
                'endpoint' => 'api.mailgun.net',
                'from_address' => $this->faker->email(),
                'from_name' => $this->faker->company(),
            ],
            default => [],
        };
    }

    /**
     * Get valid configuration for a specific provider.
     */
    private function getValidConfigForProvider(string $provider): array
    {
        return match ($provider) {
            'smtp' => [
                'host' => 'smtp.gmail.com',
                'port' => 587,
                'username' => 'test@example.com',
                'password' => 'validpassword123',
                'encryption' => 'tls',
                'from_address' => 'noreply@example.com',
                'from_name' => 'Test Application',
            ],
            'mailgun' => [
                'domain' => 'mg.example.com',
                'api_key' => 'key-'.str_repeat('a', 32),
                'endpoint' => 'api.mailgun.net',
                'from_address' => 'noreply@example.com',
                'from_name' => 'Test Application',
            ],
            default => [],
        };
    }

    /**
     * Get invalid configuration for a specific provider (missing required fields).
     */
    private function getInvalidConfigForProvider(string $provider): array
    {
        return match ($provider) {
            'smtp' => [
                'host' => 'smtp.gmail.com',
                // Missing required fields: port, username, password, encryption, from_address
                'from_name' => 'Test Application',
            ],
            'mailgun' => [
                'domain' => 'mg.example.com',
                // Missing required fields: api_key, from_address
                'endpoint' => 'api.mailgun.net',
                'from_name' => 'Test Application',
            ],
            default => [],
        };
    }
}
