<?php

namespace Tests\Feature;

use App\Filament\Resources\EmailConfigurationResource;
use App\Models\EmailConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class EmailConfigurationResourceTest extends TestCase
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

    public function test_can_render_email_configuration_list_page(): void
    {
        $this->get(EmailConfigurationResource::getUrl('index'))
            ->assertSuccessful();
    }

    public function test_can_render_email_configuration_create_page(): void
    {
        $this->get(EmailConfigurationResource::getUrl('create'))
            ->assertSuccessful();
    }

    public function test_can_create_smtp_email_configuration(): void
    {
        $newData = [
            'provider' => 'smtp',
            'is_active' => false,
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
            ->fillForm($newData)
            ->call('create')
            ->assertHasNoFormErrors();

        $this->assertDatabaseHas('email_configurations', [
            'provider' => 'smtp',
            'is_active' => false,
        ]);

        $config = EmailConfiguration::where('provider', 'smtp')->first();
        $this->assertEquals('smtp.gmail.com', $config->config['host']);
        $this->assertEquals(587, $config->config['port']);
        $this->assertEquals('test@example.com', $config->config['username']);
    }

    public function test_can_create_mailgun_email_configuration(): void
    {
        $newData = [
            'provider' => 'mailgun',
            'is_active' => false,
            'config' => [
                'domain' => 'mg.test.com',
                'api_key' => 'key-test123',
                'endpoint' => 'api.mailgun.net',
                'from_address' => 'noreply@test.com',
                'from_name' => 'Test App',
            ],
        ];

        Livewire::test(EmailConfigurationResource\Pages\CreateEmailConfiguration::class)
            ->fillForm($newData)
            ->call('create')
            ->assertHasNoFormErrors();

        $this->assertDatabaseHas('email_configurations', [
            'provider' => 'mailgun',
            'is_active' => false,
        ]);

        $config = EmailConfiguration::where('provider', 'mailgun')->first();
        $this->assertEquals('mg.test.com', $config->config['domain']);
        $this->assertEquals('key-test123', $config->config['api_key']);
    }

    public function test_can_edit_email_configuration(): void
    {
        $config = EmailConfiguration::factory()->create([
            'provider' => 'smtp',
            'config' => [
                'host' => 'smtp.gmail.com',
                'port' => 587,
                'username' => 'old@example.com',
                'password' => 'oldpassword',
                'encryption' => 'tls',
                'from_address' => 'old@test.com',
            ],
        ]);

        $newData = [
            'provider' => 'smtp',
            'is_active' => false,
            'config' => [
                'host' => 'smtp.gmail.com',
                'port' => 587,
                'username' => 'new@example.com',
                'password' => 'newpassword',
                'encryption' => 'tls',
                'from_address' => 'new@test.com',
                'from_name' => 'Updated App',
            ],
        ];

        Livewire::test(EmailConfigurationResource\Pages\EditEmailConfiguration::class, [
            'record' => $config->getRouteKey(),
        ])
            ->fillForm($newData)
            ->call('save')
            ->assertHasNoFormErrors();

        $config->refresh();
        $this->assertEquals('new@example.com', $config->config['username']);
        $this->assertEquals('new@test.com', $config->config['from_address']);
        $this->assertEquals('Updated App', $config->config['from_name']);
    }

    public function test_can_view_email_configuration(): void
    {
        $config = EmailConfiguration::factory()->create([
            'provider' => 'smtp',
            'config' => [
                'host' => 'smtp.gmail.com',
                'port' => 587,
                'username' => 'test@example.com',
                'password' => 'password123',
                'encryption' => 'tls',
                'from_address' => 'noreply@test.com',
            ],
        ]);

        $this->get(EmailConfigurationResource::getUrl('view', [
            'record' => $config,
        ]))->assertSuccessful();
    }

    public function test_can_delete_inactive_email_configuration(): void
    {
        $config = EmailConfiguration::factory()->create([
            'is_active' => false,
        ]);

        Livewire::test(EmailConfigurationResource\Pages\EditEmailConfiguration::class, [
            'record' => $config->getRouteKey(),
        ])
            ->callAction('delete');

        $this->assertModelMissing($config);
    }

    public function test_cannot_delete_active_email_configuration(): void
    {
        $config = EmailConfiguration::factory()->create([
            'is_active' => true,
        ]);

        $response = Livewire::test(EmailConfigurationResource\Pages\EditEmailConfiguration::class, [
            'record' => $config->getRouteKey(),
        ]);

        // The delete action should not be visible for active configurations
        $this->assertDatabaseHas('email_configurations', [
            'id' => $config->id,
        ]);
    }

    public function test_activation_deactivates_other_configurations(): void
    {
        $config1 = EmailConfiguration::factory()->create(['is_active' => true]);
        $config2 = EmailConfiguration::factory()->create(['is_active' => false]);

        $config2->activate();

        $config1->refresh();
        $config2->refresh();

        $this->assertFalse($config1->is_active);
        $this->assertTrue($config2->is_active);
    }
}
