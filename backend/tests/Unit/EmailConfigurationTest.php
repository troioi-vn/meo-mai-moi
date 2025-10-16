<?php

namespace Tests\Unit;

use App\Models\EmailConfiguration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailConfigurationTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_configuration_can_be_created()
    {
        $config = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => false,
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

        $this->assertInstanceOf(EmailConfiguration::class, $config);
        $this->assertEquals('smtp', $config->provider);
        $this->assertFalse($config->is_active);
        $this->assertIsArray($config->config);
    }

    public function test_config_attribute_is_cast_to_array()
    {
        $configData = [
            'host' => 'smtp.example.com',
            'port' => 587,
            'username' => 'test@example.com',
        ];

        $config = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => false,
            'config' => $configData,
        ]);

        $this->assertIsArray($config->config);
        $this->assertEquals($configData, $config->config);

        // Test retrieval from database
        $retrieved = EmailConfiguration::find($config->id);
        $this->assertIsArray($retrieved->config);
        $this->assertEquals($configData, $retrieved->config);
    }

    public function test_is_active_attribute_is_cast_to_boolean()
    {
        $config = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => '1',
            'config' => [],
        ]);

        $this->assertIsBool($config->is_active);
        $this->assertTrue($config->is_active);

        $config->update(['is_active' => '0']);
        $this->assertIsBool($config->is_active);
        $this->assertFalse($config->is_active);
    }

    public function test_get_active_returns_active_configuration()
    {
        // Create inactive configuration
        EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => false,
            'config' => ['host' => 'inactive.example.com'],
        ]);

        // Create active configuration
        $activeConfig = EmailConfiguration::create([
            'provider' => 'mailgun',
            'is_active' => true,
            'config' => ['domain' => 'mg.example.com'],
        ]);

        $result = EmailConfiguration::getActive();
        $this->assertNotNull($result);
        $this->assertEquals($activeConfig->id, $result->id);
        $this->assertTrue($result->is_active);
    }

    public function test_get_active_returns_null_when_no_active_configuration()
    {
        // Create only inactive configurations
        EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => false,
            'config' => [],
        ]);

        $result = EmailConfiguration::getActive();
        $this->assertNull($result);
    }

    public function test_activate_method_deactivates_other_configurations()
    {
        $config1 = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => true,
            'config' => [],
        ]);

        $config2 = EmailConfiguration::create([
            'provider' => 'mailgun',
            'is_active' => false,
            'config' => [],
        ]);

        $config2->activate();

        $config1->refresh();
        $config2->refresh();

        $this->assertFalse($config1->is_active);
        $this->assertTrue($config2->is_active);
    }

    public function test_activate_method_sets_current_configuration_as_active()
    {
        $config = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => false,
            'config' => [],
        ]);

        $this->assertFalse($config->is_active);

        $config->activate();

        $this->assertTrue($config->is_active);
    }

    public function test_get_mail_config_returns_smtp_configuration()
    {
        $configData = [
            'host' => 'smtp.example.com',
            'port' => 587,
            'username' => 'test@example.com',
            'password' => 'password',
            'encryption' => 'tls',
            'from_address' => 'noreply@example.com',
            'from_name' => 'Test App',
        ];

        $config = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => true,
            'config' => $configData,
        ]);

        $mailConfig = $config->getMailConfig();

        $this->assertEquals('smtp', $mailConfig['default']);
        $this->assertEquals($configData['host'], $mailConfig['mailers']['smtp']['host']);
        $this->assertEquals($configData['port'], $mailConfig['mailers']['smtp']['port']);
        $this->assertEquals($configData['username'], $mailConfig['mailers']['smtp']['username']);
        $this->assertEquals($configData['password'], $mailConfig['mailers']['smtp']['password']);
        $this->assertEquals($configData['encryption'], $mailConfig['mailers']['smtp']['encryption']);
        $this->assertEquals($configData['from_address'], $mailConfig['from']['address']);
        $this->assertEquals($configData['from_name'], $mailConfig['from']['name']);
    }

    public function test_get_mail_config_returns_mailgun_configuration()
    {
        $configData = [
            'domain' => 'mg.example.com',
            'api_key' => 'key-test123',
            'endpoint' => 'api.mailgun.net',
            'from_address' => 'noreply@example.com',
            'from_name' => 'Test App',
        ];

        $config = EmailConfiguration::create([
            'provider' => 'mailgun',
            'is_active' => true,
            'config' => $configData,
        ]);

        $mailConfig = $config->getMailConfig();

        $this->assertEquals('mailgun', $mailConfig['default']);
        $this->assertEquals($configData['domain'], $mailConfig['services']['mailgun']['domain']);
        $this->assertEquals($configData['api_key'], $mailConfig['services']['mailgun']['secret']);
        $this->assertEquals($configData['endpoint'], $mailConfig['services']['mailgun']['endpoint']);
        $this->assertEquals($configData['from_address'], $mailConfig['from']['address']);
        $this->assertEquals($configData['from_name'], $mailConfig['from']['name']);
    }

    public function test_fillable_attributes()
    {
        $config = new EmailConfiguration;
        $fillable = $config->getFillable();

        $this->assertContains('provider', $fillable);
        $this->assertContains('is_active', $fillable);
        $this->assertContains('config', $fillable);
    }

    public function test_casts_configuration()
    {
        $config = new EmailConfiguration;
        $casts = $config->getCasts();

        $this->assertArrayHasKey('config', $casts);
        $this->assertEquals('array', $casts['config']);
        $this->assertArrayHasKey('is_active', $casts);
        $this->assertEquals('boolean', $casts['is_active']);
    }

    public function test_scope_active()
    {
        EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => false,
            'config' => [],
        ]);

        $activeConfig = EmailConfiguration::create([
            'provider' => 'mailgun',
            'is_active' => true,
            'config' => [],
        ]);

        $activeConfigs = EmailConfiguration::active()->get();
        $this->assertCount(1, $activeConfigs);
        $this->assertEquals($activeConfig->id, $activeConfigs->first()->id);
    }

    public function test_scope_inactive()
    {
        $inactiveConfig = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => false,
            'config' => [],
        ]);

        EmailConfiguration::create([
            'provider' => 'mailgun',
            'is_active' => true,
            'config' => [],
        ]);

        $inactiveConfigs = EmailConfiguration::inactive()->get();
        $this->assertCount(1, $inactiveConfigs);
        $this->assertEquals($inactiveConfig->id, $inactiveConfigs->first()->id);
    }

    public function test_scope_for_provider()
    {
        $smtpConfig = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => false,
            'config' => [],
        ]);

        EmailConfiguration::create([
            'provider' => 'mailgun',
            'is_active' => false,
            'config' => [],
        ]);

        $smtpConfigs = EmailConfiguration::forProvider('smtp')->get();
        $this->assertCount(1, $smtpConfigs);
        $this->assertEquals($smtpConfig->id, $smtpConfigs->first()->id);
    }

    public function test_is_smtp_method()
    {
        $smtpConfig = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => false,
            'config' => [],
        ]);

        $mailgunConfig = EmailConfiguration::create([
            'provider' => 'mailgun',
            'is_active' => false,
            'config' => [],
        ]);

        $this->assertTrue($smtpConfig->isSmtp());
        $this->assertFalse($mailgunConfig->isSmtp());
    }

    public function test_is_mailgun_method()
    {
        $smtpConfig = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => false,
            'config' => [],
        ]);

        $mailgunConfig = EmailConfiguration::create([
            'provider' => 'mailgun',
            'is_active' => false,
            'config' => [],
        ]);

        $this->assertFalse($smtpConfig->isMailgun());
        $this->assertTrue($mailgunConfig->isMailgun());
    }

    public function test_get_config_value_method()
    {
        $config = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => false,
            'config' => [
                'host' => 'smtp.example.com',
                'port' => 587,
                'nested' => [
                    'value' => 'test',
                ],
            ],
        ]);

        $this->assertEquals('smtp.example.com', $config->getConfigValue('host'));
        $this->assertEquals(587, $config->getConfigValue('port'));
        $this->assertEquals('default', $config->getConfigValue('nonexistent', 'default'));
        $this->assertNull($config->getConfigValue('nonexistent'));
    }

    public function test_has_config_value_method()
    {
        $config = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => false,
            'config' => [
                'host' => 'smtp.example.com',
                'port' => 587,
                'empty_value' => null,
            ],
        ]);

        $this->assertTrue($config->hasConfigValue('host'));
        $this->assertTrue($config->hasConfigValue('port'));
        $this->assertTrue($config->hasConfigValue('empty_value')); // null values still count as "has"
        $this->assertFalse($config->hasConfigValue('nonexistent'));
    }

    public function test_smtp_configuration_with_test_email_address()
    {
        $configData = [
            'host' => 'smtp.example.com',
            'port' => 587,
            'username' => 'test@example.com',
            'password' => 'password',
            'encryption' => 'tls',
            'from_address' => 'noreply@example.com',
            'from_name' => 'Test App',
            'test_email_address' => 'test@example.com',
        ];

        $config = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => false,
            'config' => $configData,
        ]);

        $this->assertEquals('test@example.com', $config->getConfigValue('test_email_address'));
        $this->assertTrue($config->hasConfigValue('test_email_address'));

        // Test validation passes with valid test email
        $validationErrors = $config->validateConfig();
        $this->assertEmpty($validationErrors);
    }

    public function test_mailgun_configuration_with_test_email_address()
    {
        $configData = [
            'domain' => 'mg.example.com',
            'api_key' => 'key-test123456789',
            'from_address' => 'noreply@example.com',
            'from_name' => 'Test App',
            'test_email_address' => 'test@example.com',
        ];

        $config = EmailConfiguration::create([
            'provider' => 'mailgun',
            'is_active' => false,
            'config' => $configData,
        ]);

        $this->assertEquals('test@example.com', $config->getConfigValue('test_email_address'));
        $this->assertTrue($config->hasConfigValue('test_email_address'));

        // Test validation passes with valid test email
        $validationErrors = $config->validateConfig();
        $this->assertEmpty($validationErrors);
    }

    public function test_validation_fails_with_invalid_test_email_address()
    {
        // Test SMTP with invalid test email
        $smtpConfig = EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => false,
            'config' => [
                'host' => 'smtp.example.com',
                'port' => 587,
                'username' => 'test@example.com',
                'password' => 'password',
                'encryption' => 'tls',
                'from_address' => 'noreply@example.com',
                'test_email_address' => 'invalid-email',
            ],
        ]);

        $smtpErrors = $smtpConfig->validateConfig();
        $this->assertContains('Test email address must be a valid email format', $smtpErrors);

        // Test Mailgun with invalid test email
        $mailgunConfig = EmailConfiguration::create([
            'provider' => 'mailgun',
            'is_active' => false,
            'config' => [
                'domain' => 'mg.example.com',
                'api_key' => 'key-test123456789',
                'from_address' => 'noreply@example.com',
                'test_email_address' => 'invalid-email',
            ],
        ]);

        $mailgunErrors = $mailgunConfig->validateConfig();
        $this->assertContains('Test email address must be a valid email format', $mailgunErrors);
    }
}
