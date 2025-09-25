<?php

namespace Tests\Unit;

use App\Models\EmailConfiguration;
use App\Services\EmailConfigurationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmailConfigurationServiceTest extends TestCase
{
    use RefreshDatabase;

    private EmailConfigurationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new EmailConfigurationService;
    }

    public function test_get_active_configuration_returns_null_when_no_active_config()
    {
        $result = $this->service->getActiveConfiguration();
        $this->assertNull($result);
    }

    public function test_get_active_configuration_returns_active_config()
    {
        $config = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => true,
            'config' => [
                'host' => 'smtp.example.com',
                'port' => 587,
                'username' => 'test@example.com',
                'password' => 'password',
                'encryption' => 'tls',
                'from_address' => 'noreply@example.com',
                'from_name' => 'Test App',
            ],
        ]);

        $result = $this->service->getActiveConfiguration();
        $this->assertNotNull($result);
        $this->assertEquals($config->id, $result->id);
    }

    public function test_set_active_configuration_validates_config()
    {
        $this->expectException(\App\Exceptions\EmailConfigurationException::class);
        $this->expectExceptionMessage('Configuration validation failed');

        // Missing required fields
        $this->service->setActiveConfiguration('smtp', [
            'host' => 'smtp.example.com',
            // Missing other required fields
        ]);
    }

    public function test_set_active_configuration_creates_and_activates_config()
    {
        Mail::fake();

        $config = [
            'host' => 'smtp.example.com',
            'port' => 587,
            'username' => 'test@example.com',
            'password' => 'password',
            'encryption' => 'tls',
            'from_address' => 'noreply@example.com',
            'from_name' => 'Test App',
        ];

        $result = $this->service->setActiveConfiguration('smtp', $config);

        $this->assertInstanceOf(EmailConfiguration::class, $result);
        $this->assertTrue($result->is_active);
        $this->assertEquals('smtp', $result->provider);
        $this->assertEquals($config, $result->config);

        // Verify it's in the database
        $this->assertDatabaseHas('email_configurations', [
            'id' => $result->id,
            'provider' => 'smtp',
            'is_active' => true,
        ]);
    }

    public function test_set_active_configuration_deactivates_previous_config()
    {
        Mail::fake();

        // Create an existing active configuration
        $oldConfig = EmailConfiguration::create([
            'provider' => 'mailgun',
            'is_active' => true,
            'config' => [
                'domain' => 'mg.example.com',
                'api_key' => 'key-test',
                'from_address' => 'old@example.com',
            ],
        ]);

        $newConfigData = [
            'host' => 'smtp.example.com',
            'port' => 587,
            'username' => 'test@example.com',
            'password' => 'password',
            'encryption' => 'tls',
            'from_address' => 'new@example.com',
            'from_name' => 'Test App',
        ];

        $newConfig = $this->service->setActiveConfiguration('smtp', $newConfigData);

        // Verify old config is deactivated
        $oldConfig->refresh();
        $this->assertFalse($oldConfig->is_active);

        // Verify new config is active
        $this->assertTrue($newConfig->is_active);
    }

    public function test_test_configuration_returns_false_for_invalid_config()
    {
        $result = $this->service->testConfiguration('smtp', [
            'host' => 'smtp.example.com',
            // Missing required fields
        ]);

        $this->assertFalse($result);
    }

    public function test_test_configuration_with_active_config()
    {
        Mail::fake();

        EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => true,
            'config' => [
                'host' => 'smtp.example.com',
                'port' => 587,
                'username' => 'test@example.com',
                'password' => 'password',
                'encryption' => 'tls',
                'from_address' => 'noreply@example.com',
                'from_name' => 'Test App',
            ],
        ]);

        $result = $this->service->testConfiguration();
        $this->assertTrue($result);

        // Just verify that the method returns true when configuration is valid
        // The actual email sending is mocked by Mail::fake()
    }

    public function test_update_mail_config_with_active_configuration()
    {
        $config = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => true,
            'config' => [
                'host' => 'smtp.example.com',
                'port' => 587,
                'username' => 'test@example.com',
                'password' => 'password',
                'encryption' => 'tls',
                'from_address' => 'noreply@example.com',
                'from_name' => 'Test App',
            ],
        ]);

        $this->service->updateMailConfig();

        // Verify mail configuration was updated
        $this->assertEquals('smtp', Config::get('mail.default'));
        $mailConfig = Config::get('mail.mailers.smtp');
        $this->assertEquals('smtp.example.com', $mailConfig['host']);
        $this->assertEquals('noreply@example.com', Config::get('mail.from.address'));
    }

    public function test_update_mail_config_with_no_active_configuration()
    {
        // Should not throw exception, just log warning
        $this->service->updateMailConfig();
        $this->assertTrue(true); // Test passes if no exception thrown
    }

    public function test_deactivate_configuration()
    {
        $config = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => true,
            'config' => [
                'host' => 'smtp.example.com',
                'port' => 587,
                'username' => 'test@example.com',
                'password' => 'password',
                'encryption' => 'tls',
                'from_address' => 'noreply@example.com',
            ],
        ]);

        $this->service->deactivateConfiguration();

        $config->refresh();
        $this->assertFalse($config->is_active);
    }

    public function test_get_all_configurations()
    {
        EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => true,
            'config' => ['host' => 'smtp1.example.com', 'port' => 587, 'username' => 'test1@example.com', 'password' => 'password', 'encryption' => 'tls', 'from_address' => 'noreply1@example.com'],
        ]);

        EmailConfiguration::create([
            'provider' => 'mailgun',
            'is_active' => false,
            'config' => ['domain' => 'mg.example.com', 'api_key' => 'key-test', 'from_address' => 'noreply2@example.com'],
        ]);

        $configs = $this->service->getAllConfigurations();
        $this->assertCount(2, $configs);
    }

    public function test_delete_configuration()
    {
        $config = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => false,
            'config' => ['host' => 'smtp.example.com', 'port' => 587, 'username' => 'test@example.com', 'password' => 'password', 'encryption' => 'tls', 'from_address' => 'noreply@example.com'],
        ]);

        $result = $this->service->deleteConfiguration($config->id);
        $this->assertTrue($result);

        $this->assertDatabaseMissing('email_configurations', [
            'id' => $config->id,
        ]);
    }

    public function test_delete_active_configuration_deactivates_first()
    {
        $config = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => true,
            'config' => ['host' => 'smtp.example.com', 'port' => 587, 'username' => 'test@example.com', 'password' => 'password', 'encryption' => 'tls', 'from_address' => 'noreply@example.com'],
        ]);

        $result = $this->service->deleteConfiguration($config->id);
        $this->assertTrue($result);

        $this->assertDatabaseMissing('email_configurations', [
            'id' => $config->id,
        ]);
    }

    public function test_is_email_enabled_returns_false_when_no_config()
    {
        $result = $this->service->isEmailEnabled();
        $this->assertFalse($result);
    }

    public function test_is_email_enabled_returns_true_when_valid_config()
    {
        EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => true,
            'config' => [
                'host' => 'smtp.example.com',
                'port' => 587,
                'username' => 'test@example.com',
                'password' => 'password',
                'encryption' => 'tls',
                'from_address' => 'noreply@example.com',
            ],
        ]);

        $result = $this->service->isEmailEnabled();
        $this->assertTrue($result);
    }

    public function test_get_supported_providers()
    {
        $providers = $this->service->getSupportedProviders();

        $this->assertArrayHasKey('smtp', $providers);
        $this->assertArrayHasKey('mailgun', $providers);

        $this->assertEquals('SMTP', $providers['smtp']['name']);
        $this->assertEquals('Mailgun', $providers['mailgun']['name']);

        $this->assertIsArray($providers['smtp']['required_fields']);
        $this->assertIsArray($providers['mailgun']['required_fields']);
    }
}
