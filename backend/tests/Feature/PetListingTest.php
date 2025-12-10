<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\City;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Tests\Traits\CreatesUsers;

class PetListingTest extends TestCase
{
    use CreatesUsers;
    use RefreshDatabase;

    #[Test]
    public function can_get_single_pet_profile(): void
    {
        $user = $this->createUserAndLogin();
        $pet = Pet::factory()->create(['user_id' => $user->id]);

        $response = $this->getJson("/api/pets/{$pet->id}");
        $response->assertStatus(200)->assertJson(['data' => ['id' => $pet->id]]);
    }

    #[Test]
    public function authenticated_user_can_create_pet_listing(): void
    {
        $this->createUserAndLogin();
        $city = City::factory()->create(['country' => 'VN']);

        $petData = [
            'name' => 'Test Pet',
            'birthday' => '2023-01-01 00:00:00',
            'country' => 'VN',
            'city_id' => $city->id,
            'description' => 'Test Description',
        ];

        $response = $this->postJson('/api/pets', $petData);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['id', 'name']]);
        $this->assertDatabaseHas('pets', [
            'name' => 'Test Pet',
            'country' => 'VN',
            'city' => $city->name,
            'description' => 'Test Description',
        ]);
    }

    #[Test]
    public function guest_cannot_create_pet_listing(): void
    {
        $petData = [
            'name' => 'Test Pet',
            'birthday' => '2023-01-01',
            'country' => 'VN',
            'city_id' => City::factory()->create(['country' => 'VN'])->id,
            'description' => 'Test Description',
        ];

        $response = $this->postJson('/api/pets', $petData);
        $response->assertStatus(401);
    }
}
