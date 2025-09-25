<?php

namespace Tests\Feature;

use App\Models\EmailConfiguration;
use App\Models\User;
use App\Services\EmailConfigurationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmailConfigurationTestConnectionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles and permissions
        $this->artisan('db:seed', ['--class' => 'RolesAndPermissionsSeeder']);

        // Create an admin user for testing
        $user = User::factory()->create([
            'email' => 'admin@test.com',
        ]);

        // Assign admin role to the user
        $user->assignRole('admin');

        $this->actingAs($user);
    }

    public function test_test_connection_with_invalid_configuration(): void
    {
        $service = app(EmailConfigurationService::class);

        // Test with invalid SMTP configuration (missing required fields)
        $result = $service->testConfiguration('smtp', [
            'host' => 'smtp.gmail.com',
            // Missing port, username, password, etc.
        ]);

        $this->assertFalse($result);
    }

    public function test_test_connection_with_valid_configuration_structure(): void
    {
        Mail::fake();

        $service = app(EmailConfigurationService::class);

        // Test with valid SMTP configuration structure
        // Note: This will still fail in real scenarios without valid credentials,
        // but we're testing the validation and structure handling
        $config = [
            'host' => 'smtp.gmail.com',
            'port' => 587,
            'username' => 'test@example.com',
            'password' => 'validpassword123',
            'encryption' => 'tls',
            'from_address' => 'noreply@example.com',
            'from_name' => 'Test Application',
        ];

        // The test will fail due to invalid credentials, but we can verify
        // that the configuration structure is valid
        $emailConfig = new EmailConfiguration([
            'provider' => 'smtp',
            'config' => $config,
        ]);

        $this->assertTrue($emailConfig->isValid());
        $this->assertEmpty($emailConfig->validateConfig());
    }

    public function test_test_connection_with_mailgun_configuration(): void
    {
        $service = app(EmailConfigurationService::class);

        // Test with invalid Mailgun configuration
        $result = $service->testConfiguration('mailgun', [
            'domain' => 'mg.test.com',
            // Missing api_key and from_address
        ]);

        $this->assertFalse($result);

        // Test with valid Mailgun configuration structure
        $config = [
            'domain' => 'mg.test.com',
            'api_key' => 'key-test123',
            'endpoint' => 'api.mailgun.net',
            'from_address' => 'noreply@test.com',
            'from_name' => 'Test App',
        ];

        $emailConfig = new EmailConfiguration([
            'provider' => 'mailgun',
            'config' => $config,
        ]);

        $this->assertTrue($emailConfig->isValid());
        $this->assertEmpty($emailConfig->validateConfig());
    }

    public function test_test_connection_with_active_configuration(): void
    {
        $service = app(EmailConfigurationService::class);

        // Create and activate a configuration
        $config = EmailConfiguration::factory()->smtp()->valid()->active()->create();

        // Test the active configuration
        // This will fail due to invalid credentials, but we're testing the method call
        $result = $service->testConfiguration();

        // Should return false due to invalid test credentials, but method should work
        $this->assertFalse($result);
    }

    public function test_test_connection_with_no_active_configuration(): void
    {
        $service = app(EmailConfigurationService::class);

        // Test with no active configuration
        $result = $service->testConfiguration();

        $this->assertFalse($result);
    }

    public function test_configuration_validation_errors(): void
    {
        // Test SMTP validation errors
        $smtpConfig = new EmailConfiguration([
            'provider' => 'smtp',
            'config' => [
                'host' => 'smtp.gmail.com',
                // Missing required fields
            ],
        ]);

        $errors = $smtpConfig->validateConfig();
        $this->assertNotEmpty($errors);
        $this->assertStringContainsString('port', implode(' ', $errors));
        $this->assertStringContainsString('username', implode(' ', $errors));
        $this->assertStringContainsString('password', implode(' ', $errors));

        // Test Mailgun validation errors
        $mailgunConfig = new EmailConfiguration([
            'provider' => 'mailgun',
            'config' => [
                'domain' => 'mg.test.com',
                // Missing required fields
            ],
        ]);

        $errors = $mailgunConfig->validateConfig();
        $this->assertNotEmpty($errors);
        $this->assertStringContainsString('API key', implode(' ', $errors));
        $this->assertStringContainsString('email address', implode(' ', $errors));
    }
}
