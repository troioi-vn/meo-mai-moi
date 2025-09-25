<?php

namespace Tests\Feature;

use App\Exceptions\EmailConfigurationException;
use App\Models\EmailConfiguration;
use App\Services\EmailConfigurationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailConfigurationValidationTest extends TestCase
{
    use RefreshDatabase;

    private EmailConfigurationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(EmailConfigurationService::class);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_validates_smtp_configuration_with_detailed_errors()
    {
        $config = new EmailConfiguration([
            'provider' => 'smtp',
            'config' => [
                'host' => '', // Missing required field
                'port' => 99999, // Invalid port
                'username' => 'test@example.com',
                'password' => 'password',
                'encryption' => 'invalid', // Invalid encryption
                'from_address' => 'invalid-email', // Invalid email
            ],
        ]);

        $errors = $config->validateConfig();

        $this->assertContains('SMTP host is required', $errors);
        $this->assertContains('SMTP port must be between 1 and 65535', $errors);
        $this->assertContains('SMTP encryption must be \'tls\', \'ssl\', or empty', $errors);
        $this->assertContains('From email address must be a valid email format', $errors);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_validates_mailgun_configuration_with_detailed_errors()
    {
        $config = new EmailConfiguration([
            'provider' => 'mailgun',
            'config' => [
                'domain' => 'invalid-domain', // Invalid domain format
                'api_key' => 'invalid-key', // Invalid API key format
                'from_address' => 'invalid-email', // Invalid email
            ],
        ]);

        $errors = $config->validateConfig();

        $this->assertContains('Mailgun domain must be a valid domain format', $errors);
        $this->assertContains('Mailgun API key must be in format \'key-\' followed by alphanumeric characters', $errors);
        $this->assertContains('From email address must be a valid email format', $errors);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_provides_configuration_summary_with_warnings()
    {
        $config = new EmailConfiguration([
            'provider' => 'smtp',
            'config' => [
                'host' => 'smtp.gmail.com',
                'port' => 587,
                'username' => 'test@example.com',
                'password' => 'password',
                'encryption' => null, // This should generate a warning
                'from_address' => 'test@example.com',
                // Missing from_name should generate a warning
            ],
        ]);

        $summary = $config->getConfigurationSummary();

        $this->assertTrue($summary['is_valid']);
        $this->assertEquals('smtp', $summary['provider']);
        $this->assertEquals('test@example.com', $summary['from_address']);
        $this->assertContains('Consider setting a \'from name\' for better email presentation', $summary['warnings']);
        $this->assertContains('Using unencrypted connection - consider using TLS or SSL', $summary['warnings']);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_throws_configuration_exception_with_validation_errors()
    {
        $this->expectException(EmailConfigurationException::class);

        try {
            $this->service->setActiveConfiguration('smtp', [
                'host' => '', // Missing required field
                'port' => 587,
                'username' => 'test@example.com',
                'password' => 'password',
                'encryption' => 'tls',
                'from_address' => 'test@example.com',
            ]);
        } catch (EmailConfigurationException $e) {
            $this->assertTrue($e->hasValidationErrors());
            $this->assertContains('SMTP host is required', $e->getValidationErrors());
            throw $e;
        }
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_provides_detailed_test_results()
    {
        // This test will fail because we don't have a real SMTP server
        $result = $this->service->testConfigurationWithDetails('smtp', [
            'host' => 'nonexistent.smtp.server',
            'port' => 587,
            'username' => 'test@example.com',
            'password' => 'password',
            'encryption' => 'tls',
            'from_address' => 'test@example.com',
        ]);

        $this->assertFalse($result['success']);
        $this->assertArrayHasKey('error', $result);
        $this->assertArrayHasKey('error_type', $result);
        $this->assertArrayHasKey('technical_error', $result);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_validates_email_addresses_properly()
    {
        $validEmails = [
            'test@example.com',
            'user.name@domain.co.uk',
            'test+tag@example.org',
        ];

        $invalidEmails = [
            'invalid-email',
            '@example.com',
            'test@',
            'test..test@example.com',
        ];

        foreach ($validEmails as $email) {
            $config = new EmailConfiguration([
                'provider' => 'smtp',
                'config' => [
                    'host' => 'smtp.gmail.com',
                    'port' => 587,
                    'username' => 'test@example.com',
                    'password' => 'password',
                    'encryption' => 'tls',
                    'from_address' => $email,
                ],
            ]);

            $errors = $config->validateConfig();
            $this->assertEmpty(array_filter($errors, fn ($error) => str_contains($error, 'email address')),
                "Valid email {$email} should not produce validation errors");
        }

        foreach ($invalidEmails as $email) {
            $config = new EmailConfiguration([
                'provider' => 'smtp',
                'config' => [
                    'host' => 'smtp.gmail.com',
                    'port' => 587,
                    'username' => 'test@example.com',
                    'password' => 'password',
                    'encryption' => 'tls',
                    'from_address' => $email,
                ],
            ]);

            $errors = $config->validateConfig();
            $this->assertNotEmpty(array_filter($errors, fn ($error) => str_contains($error, 'email address')),
                "Invalid email {$email} should produce validation errors");
        }
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_validates_port_ranges()
    {
        $validPorts = [1, 25, 587, 465, 993, 65535];
        $invalidPorts = [0, -1, 65536, 99999];

        foreach ($validPorts as $port) {
            $config = new EmailConfiguration([
                'provider' => 'smtp',
                'config' => [
                    'host' => 'smtp.gmail.com',
                    'port' => $port,
                    'username' => 'test@example.com',
                    'password' => 'password',
                    'encryption' => 'tls',
                    'from_address' => 'test@example.com',
                ],
            ]);

            $errors = $config->validateConfig();
            $this->assertEmpty(array_filter($errors, fn ($error) => str_contains($error, 'port')),
                "Valid port {$port} should not produce validation errors");
        }

        foreach ($invalidPorts as $port) {
            $config = new EmailConfiguration([
                'provider' => 'smtp',
                'config' => [
                    'host' => 'smtp.gmail.com',
                    'port' => $port,
                    'username' => 'test@example.com',
                    'password' => 'password',
                    'encryption' => 'tls',
                    'from_address' => 'test@example.com',
                ],
            ]);

            $errors = $config->validateConfig();
            $this->assertNotEmpty(array_filter($errors, fn ($error) => str_contains($error, 'port')),
                "Invalid port {$port} should produce validation errors");
        }
    }
}
