<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CityTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        Sanctum::actingAs($this->user);
    }

    public function test_can_list_cities_for_country(): void
    {
        City::factory()->create(['name' => 'Hanoi', 'country' => 'VN']);
        City::factory()->create(['name' => 'Da Nang', 'country' => 'VN']);
        City::factory()->create(['name' => 'New York', 'country' => 'US']);

        $response = $this->getJson('/api/cities?country=VN');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['name' => 'Hanoi'])
            ->assertJsonMissing(['name' => 'New York']);
    }

    public function test_list_cities_requires_country(): void
    {
        $response = $this->getJson('/api/cities');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['country']);
    }

    public function test_can_search_cities(): void
    {
        City::factory()->create(['name' => 'Ho Chi Minh City', 'country' => 'VN']);
        City::factory()->create(['name' => 'Hanoi', 'country' => 'VN']);

        $response = $this->getJson('/api/cities?country=VN&search=hanoi');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment(['name' => 'Hanoi']);
    }

    public function test_user_can_see_own_unapproved_cities(): void
    {
        Sanctum::actingAs($this->user);

        City::factory()->unapproved()->create([
            'name' => 'My Pending City',
            'country' => 'VN',
            'created_by' => $this->user->id,
        ]);

        City::factory()->unapproved()->create([
            'name' => 'Other Pending City',
            'country' => 'VN',
        ]);

        $response = $this->getJson('/api/cities?country=VN');

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'My Pending City'])
            ->assertJsonMissing(['name' => 'Other Pending City']);
    }

    public function test_can_create_city(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson('/api/cities', [
            'name' => 'Hue',
            'country' => 'VN',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'name' => 'Hue',
                'country' => 'VN',
            ]);

        $this->assertDatabaseHas('cities', [
            'name->en' => 'Hue',
            'country' => 'VN',
            'created_by' => $this->user->id,
        ]);
    }

    public function test_cannot_create_duplicate_city_in_same_country(): void
    {
        Sanctum::actingAs($this->user);

        City::factory()->create(['name' => 'Hue', 'country' => 'VN']);

        $response = $this->postJson('/api/cities', [
            'name' => 'Hue',
            'country' => 'VN',
        ]);

        $response->assertStatus(422);
    }

    public function test_city_creation_is_rate_limited_to_10_per_24_hours(): void
    {
        Sanctum::actingAs($this->user);

        // Create 10 cities for the user
        for ($i = 1; $i <= 10; $i++) {
            City::factory()->create([
                'name' => "City {$i}",
                'country' => 'VN',
                'created_by' => $this->user->id,
                'created_at' => now(),
            ]);
        }

        // Attempt to create an 11th city, which should be rate limited
        $response = $this->postJson('/api/cities', [
            'name' => 'City 11',
            'country' => 'VN',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'error' => 'You have reached the limit of 10 cities per 24 hours. Please try again later.',
            ]);

        // Verify that the city was not created
        $this->assertDatabaseMissing('cities', [
            'name->en' => 'City 11',
            'country' => 'VN',
            'created_by' => $this->user->id,
        ]);
    }
}
