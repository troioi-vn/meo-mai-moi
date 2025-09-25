<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiContractTest extends TestCase
{
    use RefreshDatabase;

    protected $openApiSpec;

    protected function setUp(): void
    {
        parent::setUp();
        $this->openApiSpec = json_decode(File::get(base_path('storage/api-docs/api-docs.json')), true);
    }

    #[Test]
    public function api_documentation_is_up_to_date(): void
    {
        // Generate the OpenAPI documentation
        $this->artisan('l5-swagger:generate');

        // Read the newly generated documentation
        $generatedSpec = File::get(base_path('storage/api-docs/api-docs.json'));

        // Assert that the generated documentation is identical to the committed one
        $this->assertJsonStringEqualsJsonString(
            json_encode($this->openApiSpec),
            $generatedSpec,
            'OpenAPI documentation is not up to date. Please run `php artisan l5-swagger:generate` and commit the changes.'
        );
    }

    // You can add more tests here to validate specific endpoints against their schemas
    // For example, a test to ensure a specific response structure

}
