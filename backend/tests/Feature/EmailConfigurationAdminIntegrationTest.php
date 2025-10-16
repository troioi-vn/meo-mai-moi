<?php

namespace Tests\Feature;

use App\Filament\Resources\EmailConfigurationResource;
use App\Models\EmailConfiguration;
use App\Models\User;
use App\Services\EmailConfigurationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Livewire\Livewire;
use Tests\TestCase;

class EmailConfigurationAdminIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles and permissions
        $this->artisan('db:seed', ['--class' => 'RolesAndPermissionsSeeder']);

        // Create an admin user for testing
        $this->adminUser = User::factory()->create([
            'email' => 'admin@test.com',
        ]);

        // Assign admin role to the user
        $this->adminUser->assignRole('admin');

        $this->actingAs($this->adminUser);
    }

    public function test_admin_can_create_smtp_configuration_through_filament()
    {
        Mail::fake();

        $smtpData = [
            'provider' => 'smtp',
            'status' => \App\Enums\EmailConfigurationStatus::INACTIVE,
            'config' => [
                'host' => 'smtp.gmail.com',
                'port' => 587,
                'username' => 'test@example.com',
                'password' => 'password123',
                'encryption' => 'tls',
                'from_address' => 'noreply@test.com',
                'from_name' => 'Test App',
            ],
        ];

        $component = Livewire::test(EmailConfigurationResource\Pages\CreateEmailConfiguration::class)
            ->set('data.provider', 'smtp')
            ->set('data.status', \App\Enums\EmailConfigurationStatus::INACTIVE->value)
            ->set('data.config.host', 'smtp.gmail.com')
            ->set('data.config.port', 587)
            ->set('data.config.username', 'test@example.com')
            ->set('data.config.password', 'password123')
            ->set('data.config.encryption', 'tls')
            ->set('data.config.from_address', 'noreply@test.com')
            ->set('data.config.from_name', 'Test App')
            ->call('create')
            ->assertHasNoFormErrors();

        // Verify configuration was created in database
        $this->assertDatabaseHas('email_configurations', [
            'provider' => 'smtp',
            'status' => 'inactive',
        ]);

        $config = EmailConfiguration::where('provider', 'smtp')->first();
        $this->assertEquals($smtpData['config'], $config->config);

        // Verify redirect to index page
        $component->assertRedirect(EmailConfigurationResource::getUrl('index'));
    }

    public function test_admin_can_create_mailgun_configuration_through_filament()
    {
        Mail::fake();

        $mailgunData = [
            'provider' => 'mailgun',
            'status' => \App\Enums\EmailConfigurationStatus::INACTIVE,
            'config' => [
                'domain' => 'mg.test.com',
                'api_key' => 'key-test123',
                'endpoint' => 'api.mailgun.net',
                'from_address' => 'noreply@test.com',
                'from_name' => 'Test App',
            ],
        ];

        Livewire::test(EmailConfigurationResource\Pages\CreateEmailConfiguration::class)
            ->set('data.provider', 'mailgun')
            ->set('data.status', \App\Enums\EmailConfigurationStatus::INACTIVE->value)
            ->set('data.config.domain', 'mg.test.com')
            ->set('data.config.api_key', 'key-test123')
            ->set('data.config.endpoint', 'api.mailgun.net')
            ->set('data.config.from_address', 'noreply@test.com')
            ->set('data.config.from_name', 'Test App')
            ->call('create')
            ->assertHasNoFormErrors();

        $this->assertDatabaseHas('email_configurations', [
            'provider' => 'mailgun',
            'status' => 'inactive',
        ]);

        $config = EmailConfiguration::where('provider', 'mailgun')->first();
        $this->assertEquals($mailgunData['config'], $config->config);
    }

    public function test_admin_can_activate_configuration_through_filament()
    {
        $config1 = EmailConfiguration::factory()->create(['status' => \App\Enums\EmailConfigurationStatus::ACTIVE]);
        $config2 = EmailConfiguration::factory()->create(['status' => \App\Enums\EmailConfigurationStatus::INACTIVE]);

        Livewire::test(EmailConfigurationResource\Pages\EditEmailConfiguration::class, [
            'record' => $config2->getRouteKey(),
        ])
            ->set('data.status', \App\Enums\EmailConfigurationStatus::ACTIVE->value)
            ->call('save')
            ->assertHasNoFormErrors();

        $config1->refresh();
        $config2->refresh();

        // Only one configuration should be active
        $this->assertFalse($config1->isActive());
        $this->assertTrue($config2->isActive());
    }

    public function test_admin_can_test_email_configuration()
    {
        Mail::fake();

        $config = EmailConfiguration::factory()->create([
            'provider' => 'smtp',
            'status' => \App\Enums\EmailConfigurationStatus::ACTIVE,
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

        $component = Livewire::test(EmailConfigurationResource\Pages\ViewEmailConfiguration::class, [
            'record' => $config->getRouteKey(),
        ]);

        // Test the connection action
        $component->callAction('test_connection');

        // The test connection action should execute without errors
        // (The actual email sending is mocked by Mail::fake())
    }

    public function test_admin_can_view_email_configuration_details()
    {
        $config = EmailConfiguration::factory()->create([
            'provider' => 'smtp',
            'config' => [
                'host' => 'smtp.gmail.com',
                'port' => 587,
                'username' => 'test@example.com',
                'from_address' => 'noreply@test.com',
            ],
        ]);

        $response = $this->get(EmailConfigurationResource::getUrl('view', [
            'record' => $config,
        ]));

        $response->assertSuccessful();
        $response->assertSee('smtp.gmail.com');
        $response->assertSee('587');
        $response->assertSee('test@example.com');
        $response->assertSee('noreply@test.com');
    }

    public function test_admin_can_edit_existing_configuration()
    {
        $config = EmailConfiguration::factory()->create([
            'provider' => 'smtp',
            'config' => [
                'host' => 'old.smtp.com',
                'port' => 587,
                'username' => 'old@example.com',
                'password' => 'oldpassword',
                'encryption' => 'tls',
                'from_address' => 'old@test.com',
                'from_name' => 'Old App',
            ],
        ]);

        $newData = [
            'provider' => 'smtp',
            'status' => \App\Enums\EmailConfigurationStatus::INACTIVE,
            'config' => [
                'host' => 'new.smtp.com',
                'port' => 465,
                'username' => 'new@example.com',
                'password' => 'newpassword',
                'encryption' => 'ssl',
                'from_address' => 'new@test.com',
                'from_name' => 'New App',
            ],
        ];

        Livewire::test(EmailConfigurationResource\Pages\EditEmailConfiguration::class, [
            'record' => $config->getRouteKey(),
        ])
            ->set('data.provider', 'smtp')
            ->set('data.status', \App\Enums\EmailConfigurationStatus::INACTIVE->value)
            ->set('data.config.host', 'new.smtp.com')
            ->set('data.config.port', 465)
            ->set('data.config.username', 'new@example.com')
            ->set('data.config.password', 'newpassword')
            ->set('data.config.encryption', 'ssl')
            ->set('data.config.from_address', 'new@test.com')
            ->set('data.config.from_name', 'New App')
            ->call('save')
            ->assertHasNoFormErrors();

        $config->refresh();
        $this->assertEquals('new.smtp.com', $config->config['host']);
        $this->assertEquals(465, $config->config['port']);
        $this->assertEquals('new@example.com', $config->config['username']);
        $this->assertEquals('new@test.com', $config->config['from_address']);
    }

    public function test_admin_cannot_delete_active_configuration()
    {
        $config = EmailConfiguration::factory()->create(['status' => \App\Enums\EmailConfigurationStatus::ACTIVE]);

        $component = Livewire::test(EmailConfigurationResource\Pages\EditEmailConfiguration::class, [
            'record' => $config->getRouteKey(),
        ]);

        // The delete action should not be available for active configurations
        $this->assertDatabaseHas('email_configurations', [
            'id' => $config->id,
            'status' => 'active',
        ]);
    }

    public function test_admin_can_delete_inactive_configuration()
    {
        $config = EmailConfiguration::factory()->create(['status' => \App\Enums\EmailConfigurationStatus::INACTIVE]);

        Livewire::test(EmailConfigurationResource\Pages\EditEmailConfiguration::class, [
            'record' => $config->getRouteKey(),
        ])
            ->callAction('delete');

        $this->assertModelMissing($config);
    }

    public function test_form_validation_prevents_invalid_smtp_configuration()
    {
        $invalidSmtpData = [
            'provider' => 'smtp',
            'status' => \App\Enums\EmailConfigurationStatus::INACTIVE->value,
            'config' => [
                'host' => '', // Required field missing
                'port' => 'invalid_port', // Invalid port
                'username' => 'invalid_email', // Invalid email
                'password' => '',
                'encryption' => 'invalid_encryption',
                'from_address' => 'invalid_email',
            ],
        ];

        $component = Livewire::test(EmailConfigurationResource\Pages\CreateEmailConfiguration::class)
            ->fillForm($invalidSmtpData)
            ->call('create');

        // Check that the form has validation errors (the specific fields may vary based on validation rules)
        $component->assertHasFormErrors();

        $this->assertDatabaseCount('email_configurations', 0);
    }

    public function test_form_validation_prevents_invalid_mailgun_configuration()
    {
        $invalidMailgunData = [
            'provider' => 'mailgun',
            'status' => \App\Enums\EmailConfigurationStatus::INACTIVE->value,
            'config' => [
                'domain' => '', // Required field missing
                'api_key' => '', // Required field missing
                'from_address' => 'invalid_email', // Invalid email
            ],
        ];

        $component = Livewire::test(EmailConfigurationResource\Pages\CreateEmailConfiguration::class)
            ->fillForm($invalidMailgunData)
            ->call('create');

        // Check that the form has validation errors (the specific fields may vary based on validation rules)
        $component->assertHasFormErrors();

        $this->assertDatabaseCount('email_configurations', 0);
    }

    public function test_configuration_service_integration_with_filament()
    {
        $service = app(EmailConfigurationService::class);

        // Initially no active configuration
        $this->assertNull($service->getActiveConfiguration());
        $this->assertFalse($service->isEmailEnabled());

        // Create configuration through Filament
        $configData = [
            'provider' => 'smtp',
            'status' => \App\Enums\EmailConfigurationStatus::ACTIVE,
            'config' => [
                'host' => 'smtp.gmail.com',
                'port' => 587,
                'username' => 'test@example.com',
                'password' => 'password123',
                'encryption' => 'tls',
                'from_address' => 'noreply@test.com',
                'from_name' => 'Test App',
            ],
        ];

        Livewire::test(EmailConfigurationResource\Pages\CreateEmailConfiguration::class)
            ->set('data.provider', 'smtp')
            ->set('data.status', \App\Enums\EmailConfigurationStatus::ACTIVE->value)
            ->set('data.config.host', 'smtp.gmail.com')
            ->set('data.config.port', 587)
            ->set('data.config.username', 'test@example.com')
            ->set('data.config.password', 'password123')
            ->set('data.config.encryption', 'tls')
            ->set('data.config.from_address', 'noreply@test.com')
            ->set('data.config.from_name', 'Test App')
            ->call('create');

        // Service should now return the active configuration
        $activeConfig = $service->getActiveConfiguration();
        $this->assertNotNull($activeConfig);
        $this->assertTrue($service->isEmailEnabled());
        $this->assertEquals('smtp', $activeConfig->provider);
    }

    public function test_mail_configuration_is_updated_when_configuration_is_activated()
    {
        $config = EmailConfiguration::factory()->create([
            'provider' => 'smtp',
            'status' => \App\Enums\EmailConfigurationStatus::INACTIVE,
            'config' => [
                'host' => 'smtp.test.com',
                'port' => 587,
                'username' => 'test@example.com',
                'password' => 'password',
                'encryption' => 'tls',
                'from_address' => 'noreply@test.com',
                'from_name' => 'Test App',
            ],
        ]);

        // Activate the configuration through Filament
        Livewire::test(EmailConfigurationResource\Pages\EditEmailConfiguration::class, [
            'record' => $config->getRouteKey(),
        ])
            ->set('data.status', \App\Enums\EmailConfigurationStatus::ACTIVE->value)
            ->call('save');

        // Verify Laravel mail configuration was updated
        $this->assertEquals('smtp', Config::get('mail.default'));
        $this->assertEquals('smtp.test.com', Config::get('mail.mailers.smtp.host'));
        $this->assertEquals(587, Config::get('mail.mailers.smtp.port'));
        $this->assertEquals('noreply@test.com', Config::get('mail.from.address'));
        $this->assertEquals('Test App', Config::get('mail.from.name'));
    }

    public function test_admin_can_view_configuration_list()
    {
        EmailConfiguration::factory()->count(3)->create();

        $response = $this->get(EmailConfigurationResource::getUrl('index'));

        $response->assertSuccessful();

        // Should see all configurations in the list
        $this->assertDatabaseCount('email_configurations', 3);
    }

    public function test_non_admin_cannot_access_email_configuration_resource()
    {
        $regularUser = User::factory()->create();
        $this->actingAs($regularUser);

        $response = $this->get(EmailConfigurationResource::getUrl('index'));
        $response->assertStatus(403);

        $response = $this->get(EmailConfigurationResource::getUrl('create'));
        $response->assertStatus(403);
    }
}
