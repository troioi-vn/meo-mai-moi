<?php

namespace Tests\Feature;

use App\Enums\PetStatus;
use App\Enums\PetTypeStatus;
use App\Models\City;
use App\Models\Pet;
use App\Models\PetType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PetFeatureTest extends TestCase
{
    use RefreshDatabase;

    private function createPetType(string $name, string $slug, int $displayOrder = 0): PetType
    {
        return PetType::create([
            'name' => $name,
            'slug' => $slug,
            'status' => PetTypeStatus::ACTIVE,
            'is_system' => true,
            'display_order' => $displayOrder,
        ]);
    }

    private function petPayload(array $overrides = []): array
    {
        $country = $overrides['country'] ?? 'VN';
        $city = City::factory()->create(['country' => $country]);

        return array_merge([
            'name' => 'Fluffy',
            'birthday' => '2020-01-01',
            'country' => $country,
            'city_id' => $city->id,
            'description' => 'A friendly pet',
        ], $overrides);
    }

    #[Test]
    public function creating_pet_without_pet_type_defaults_to_cat()
    {
        $user = User::factory()->create();
        $catType = $this->createPetType('Cat', 'cat', 0);

        $this->actingAs($user);
        $response = $this->postJson('/api/pets', $this->petPayload());

        $response->assertStatus(201);
        $petId = $response->json('data.id');
        $this->assertNotNull($petId);
        $pet = Pet::find($petId);
        $this->assertEquals($catType->id, $pet->pet_type_id, 'Pet should default to cat type');
    }

    #[Test]
    public function my_pets_can_be_filtered_by_pet_type_slug()
    {
        $user = User::factory()->create();
        $catType = $this->createPetType('Cat', 'cat', 0);
        $dogType = $this->createPetType('Dog', 'dog', 1);

        $this->actingAs($user);
        // Create cat (omit pet_type_id) defaults to cat
        $this->postJson('/api/pets', $this->petPayload(['name' => 'Whiskers']))->assertStatus(201);
        // Create dog
        $this->postJson('/api/pets', $this->petPayload(['name' => 'Rover', 'pet_type_id' => $dogType->id]))->assertStatus(201);

        $response = $this->getJson('/api/my-pets?pet_type=dog');
        $response->assertStatus(200);
        $pets = $response->json('data');
        $this->assertCount(1, $pets, 'Should return only one dog');
        $this->assertEquals('Rover', $pets[0]['name']);
    }

    #[Test]
    public function soft_deleted_pet_is_excluded_from_my_pets()
    {
        $user = User::factory()->create();
        $this->createPetType('Cat', 'cat', 0);
        $this->actingAs($user);
        $response = $this->postJson('/api/pets', $this->petPayload(['name' => 'TempPet']));
        $petId = $response->json('data.id');
        $this->deleteJson('/api/pets/'.$petId, ['password' => 'password'])->assertStatus(204);

        $this->assertDatabaseHas('pets', [
            'id' => $petId,
            'status' => PetStatus::DELETED->value,
        ]);

        $list = $this->getJson('/api/my-pets');
        $list->assertStatus(200);
        $this->assertEmpty($list->json('data'), 'Deleted pet should be excluded from listing');
    }
}
