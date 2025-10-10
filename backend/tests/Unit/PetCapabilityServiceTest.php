<?php

namespace Tests\Unit;

use App\Models\Pet;
use App\Models\User;
use App\Services\PetCapabilityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PetCapabilityServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Run the PetTypeSeeder to ensure pet types exist with correct capabilities
        $this->seed(\Database\Seeders\PetTypeSeeder::class);
    }

    #[Test]
    public function placement_capability_returns_error_code_for_unsupported_pet_type()
    {
        $user = User::factory()->create();
        $dog = Pet::factory()->create(['user_id' => $user->id, 'pet_type_id' => 2]);

        $this->expectException(ValidationException::class);
        try {
            PetCapabilityService::ensure($dog, 'placement');
        } catch (ValidationException $ex) {
            $response = $ex->response ?: response()->json([]);
            $payload = $response->getData(true);
            $this->assertEquals('FEATURE_NOT_AVAILABLE_FOR_PET_TYPE', $payload['error_code'] ?? null);
            throw $ex;
        }
    }

    public function test_cat_supports_all_capabilities()
    {
        $cat = Pet::factory()->create(['pet_type_id' => 1]);
        $this->assertTrue(PetCapabilityService::supports($cat, 'photos'));
        $this->assertTrue(PetCapabilityService::supports($cat, 'comments'));
        $this->assertTrue(PetCapabilityService::supports($cat, 'medical'));
        $this->assertTrue(PetCapabilityService::supports($cat, 'weight'));
        $this->assertTrue(PetCapabilityService::supports($cat, 'placement'));
        $this->assertTrue(PetCapabilityService::supports($cat, 'fostering'));
        $this->assertTrue(PetCapabilityService::supports($cat, 'ownership'));
        $this->assertTrue(PetCapabilityService::supports($cat, 'status_update'));
    }

    public function test_dog_supports_only_photos()
    {
        $dog = Pet::factory()->create(['pet_type_id' => 2]);
        $this->assertTrue(PetCapabilityService::supports($dog, 'photos'));
        $this->assertFalse(PetCapabilityService::supports($dog, 'comments'));
        $this->assertFalse(PetCapabilityService::supports($dog, 'medical'));
        $this->assertFalse(PetCapabilityService::supports($dog, 'weight'));
        $this->assertFalse(PetCapabilityService::supports($dog, 'placement'));
        $this->assertFalse(PetCapabilityService::supports($dog, 'fostering'));
        $this->assertFalse(PetCapabilityService::supports($dog, 'ownership'));
        $this->assertFalse(PetCapabilityService::supports($dog, 'status_update'));
    }

    public function test_ensure_throws_exception_for_unsupported_capability()
    {
        $dog = Pet::factory()->create(['pet_type_id' => 2]);
        $this->expectException(ValidationException::class);
        PetCapabilityService::ensure($dog, 'placement');
    }

    public function test_ensure_passes_for_supported_capability()
    {
        $cat = Pet::factory()->create(['pet_type_id' => 1]);
        PetCapabilityService::ensure($cat, 'placement');
        $this->assertTrue(true);
    }

    public function test_get_capabilities_for_cat()
    {
        $capabilities = PetCapabilityService::getCapabilities('cat');
        $this->assertTrue($capabilities['photos']);
        $this->assertTrue($capabilities['comments']);
        $this->assertTrue($capabilities['medical']);
        $this->assertTrue($capabilities['weight']);
        $this->assertTrue($capabilities['placement']);
        $this->assertTrue($capabilities['fostering']);
        $this->assertTrue($capabilities['ownership']);
        $this->assertTrue($capabilities['status_update']);
    }

    public function test_get_capabilities_for_dog()
    {
        $capabilities = PetCapabilityService::getCapabilities('dog');
        $this->assertTrue($capabilities['photos']);
        $this->assertFalse($capabilities['comments']);
        $this->assertFalse($capabilities['medical']);
        $this->assertFalse($capabilities['weight']);
        $this->assertFalse($capabilities['placement']);
        $this->assertFalse($capabilities['fostering']);
        $this->assertFalse($capabilities['ownership']);
        $this->assertFalse($capabilities['status_update']);
    }

    public function test_get_capability_matrix()
    {
        $matrix = PetCapabilityService::getCapabilityMatrix();
        $this->assertIsArray($matrix);
        $this->assertArrayHasKey('photos', $matrix);
        $this->assertArrayHasKey('placement', $matrix);
        $this->assertContains('cat', $matrix['photos']);
        $this->assertContains('dog', $matrix['photos']);
        $this->assertContains('cat', $matrix['placement']);
        $this->assertNotContains('dog', $matrix['placement']);
    }
}
