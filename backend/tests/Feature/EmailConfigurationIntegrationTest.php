<?php

namespace Tests\Feature;

use App\Models\EmailConfiguration;
use App\Models\User;
use App\Services\EmailConfigurationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailConfigurationIntegrationTest extends TestCase
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

    public function test_email_configuration_service_integration(): void
    {
        $service = app(EmailConfigurationService::class);
        
        // Initially no active configuration
        $this->assertNull($service->getActiveConfiguration());
        $this->assertFalse($service->isEmailEnabled());
        
        // Create a valid SMTP configuration
        $config = EmailConfiguration::factory()->smtp()->valid()->create();
        
        // Still not active until we activate it
        $this->assertFalse($service->isEmailEnabled());
        
        // Activate the configuration
        $config->activate();
        
        // Now it should be active
        $this->assertTrue($service->isEmailEnabled());
        $this->assertEquals($config->id, $service->getActiveConfiguration()->id);
    }

    public function test_configuration_validation(): void
    {
        // Valid SMTP configuration
        $validSmtp = EmailConfiguration::factory()->smtp()->valid()->create();
        $this->assertTrue($validSmtp->isValid());
        $this->assertEmpty($validSmtp->validateConfig());
        
        // Invalid SMTP configuration
        $invalidSmtp = EmailConfiguration::factory()->smtp()->invalid()->create();
        $this->assertFalse($invalidSmtp->isValid());
        $this->assertNotEmpty($invalidSmtp->validateConfig());
        
        // Valid Mailgun configuration
        $validMailgun = EmailConfiguration::factory()->mailgun()->valid()->create();
        $this->assertTrue($validMailgun->isValid());
        $this->assertEmpty($validMailgun->validateConfig());
        
        // Invalid Mailgun configuration
        $invalidMailgun = EmailConfiguration::factory()->mailgun()->invalid()->create();
        $this->assertFalse($invalidMailgun->isValid());
        $this->assertNotEmpty($invalidMailgun->validateConfig());
    }

    public function test_only_one_configuration_can_be_active(): void
    {
        $config1 = EmailConfiguration::factory()->smtp()->create(['is_active' => true]);
        $config2 = EmailConfiguration::factory()->mailgun()->create(['is_active' => false]);
        $config3 = EmailConfiguration::factory()->smtp()->create(['is_active' => false]);
        
        // Only config1 should be active
        $this->assertTrue($config1->fresh()->is_active);
        $this->assertFalse($config2->fresh()->is_active);
        $this->assertFalse($config3->fresh()->is_active);
        
        // Activate config2
        $config2->activate();
        
        // Now only config2 should be active
        $this->assertFalse($config1->fresh()->is_active);
        $this->assertTrue($config2->fresh()->is_active);
        $this->assertFalse($config3->fresh()->is_active);
        
        // Activate config3
        $config3->activate();
        
        // Now only config3 should be active
        $this->assertFalse($config1->fresh()->is_active);
        $this->assertFalse($config2->fresh()->is_active);
        $this->assertTrue($config3->fresh()->is_active);
    }

    public function test_mail_config_generation(): void
    {
        // Test SMTP configuration
        $smtpConfig = EmailConfiguration::factory()->smtp()->create([
            'config' => [
                'host' => 'smtp.gmail.com',
                'port' => 587,
                'username' => 'test@example.com',
                'password' => 'password123',
                'encryption' => 'tls',
                'from_address' => 'noreply@test.com',
                'from_name' => 'Test App',
            ],
        ]);
        
        $mailConfig = $smtpConfig->getMailConfig();
        $this->assertEquals('smtp', $mailConfig['transport']);
        $this->assertEquals('smtp.gmail.com', $mailConfig['host']);
        $this->assertEquals(587, $mailConfig['port']);
        $this->assertEquals('tls', $mailConfig['encryption']);
        
        $fromConfig = $smtpConfig->getFromAddress();
        $this->assertEquals('noreply@test.com', $fromConfig['address']);
        $this->assertEquals('Test App', $fromConfig['name']);
        
        // Test Mailgun configuration
        $mailgunConfig = EmailConfiguration::factory()->mailgun()->create([
            'config' => [
                'domain' => 'mg.test.com',
                'api_key' => 'key-test123',
                'endpoint' => 'api.mailgun.net',
                'from_address' => 'noreply@test.com',
                'from_name' => 'Test App',
            ],
        ]);
        
        $mailConfig = $mailgunConfig->getMailConfig();
        $this->assertEquals('mailgun', $mailConfig['transport']);
        $this->assertEquals('mg.test.com', $mailConfig['domain']);
        $this->assertEquals('key-test123', $mailConfig['secret']);
        $this->assertEquals('api.mailgun.net', $mailConfig['endpoint']);
    }

    public function test_supported_providers(): void
    {
        $service = app(EmailConfigurationService::class);
        $providers = $service->getSupportedProviders();
        
        $this->assertArrayHasKey('smtp', $providers);
        $this->assertArrayHasKey('mailgun', $providers);
        
        $this->assertEquals('SMTP', $providers['smtp']['name']);
        $this->assertEquals('Mailgun', $providers['mailgun']['name']);
        
        $this->assertContains('host', $providers['smtp']['required_fields']);
        $this->assertContains('domain', $providers['mailgun']['required_fields']);
    }
}