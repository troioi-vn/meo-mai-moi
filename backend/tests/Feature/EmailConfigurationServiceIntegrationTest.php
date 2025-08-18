<?php

namespace Tests\Feature;

use App\Services\EmailConfigurationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailConfigurationServiceIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_configuration_service_can_be_resolved_from_container()
    {
        $service = app(EmailConfigurationService::class);
        $this->assertInstanceOf(EmailConfigurationService::class, $service);
    }

    public function test_email_configuration_service_is_singleton()
    {
        $service1 = app(EmailConfigurationService::class);
        $service2 = app(EmailConfigurationService::class);
        
        $this->assertSame($service1, $service2);
    }

    public function test_service_methods_work_through_container()
    {
        $service = app(EmailConfigurationService::class);
        
        // Test that methods work when resolved from container
        $this->assertNull($service->getActiveConfiguration());
        $this->assertFalse($service->isEmailEnabled());
        $this->assertIsArray($service->getSupportedProviders());
    }
}