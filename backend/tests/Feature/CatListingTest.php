<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

class CatListingTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_can_get_all_available_cats(): void
    {
        Cat::factory()->count(5)->create();
        $response = $this->getJson('/api/cats');
        $response->assertStatus(200)->assertJsonCount(5);
    }

    public function test_can_get_featured_cats(): void
    {
        Cat::factory()->count(5)->create();
        $response = $this->getJson('/api/cats/featured');
        $response->assertStatus(200)->assertJsonCount(3);
    }

    public function test_can_get_single_cat_profile(): void
    {
        $cat = Cat::factory()->create();
        $response = $this->getJson("/api/cats/{$cat->id}");
        $response->assertStatus(200)->assertJson(['id' => $cat->id]);
    }

    public function test_authenticated_user_can_create_cat_listing(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $catData = [
            'name' => 'Test Cat',
            'breed' => 'Test Breed',
            'age' => 1,
            'location' => 'Test Location',
            'description' => 'Test Description',
        ];

        $response = $this->postJson('/api/cats', $catData);

        $response->assertStatus(201);
        $this->assertDatabaseHas('cats', $catData);
    }

    public function test_guest_cannot_create_cat_listing(): void
    {
        $catData = [
            'name' => 'Test Cat',
            'breed' => 'Test Breed',
            'age' => 1,
            'location' => 'Test Location',
            'description' => 'Test Description',
        ];

        $response = $this->postJson('/api/cats', $catData);

        $response->assertStatus(401);
    }

    public function test_can_filter_cats_by_location(): void
    {
        Cat::factory()->create(['location' => 'New York']);
        Cat::factory()->create(['location' => 'Los Angeles']);
        Cat::factory()->create(['location' => 'New York']);

        $response = $this->getJson('/api/cats?location=New York');
        $response->assertStatus(200)->assertJsonCount(2);
    }

    public function test_can_filter_cats_by_breed(): void
    {
        Cat::factory()->create(['breed' => 'Siamese']);
        Cat::factory()->create(['breed' => 'Persian']);
        Cat::factory()->create(['breed' => 'Siamese']);

        $response = $this->getJson('/api/cats?breed=Siamese');
        $response->assertStatus(200)->assertJsonCount(2);
    }

    public function test_can_sort_cats_by_name_ascending(): void
    {
        Cat::factory()->create(['name' => 'B Cat']);
        Cat::factory()->create(['name' => 'A Cat']);
        Cat::factory()->create(['name' => 'C Cat']);

        $response = $this->getJson('/api/cats?sort_by=name&sort_direction=asc');
        $response->assertStatus(200)
                 ->assertJsonPath('0.name', 'A Cat')
                 ->assertJsonPath('1.name', 'B Cat')
                 ->assertJsonPath('2.name', 'C Cat');
    }

    public function test_can_sort_cats_by_name_descending(): void
    {
        Cat::factory()->create(['name' => 'B Cat']);
        Cat::factory()->create(['name' => 'A Cat']);
        Cat::factory()->create(['name' => 'C Cat']);

        $response = $this->getJson('/api/cats?sort_by=name&sort_direction=desc');
        $response->assertStatus(200)
                 ->assertJsonPath('0.name', 'C Cat')
                 ->assertJsonPath('1.name', 'B Cat')
                 ->assertJsonPath('2.name', 'A Cat');
    }

    public function test_can_sort_cats_by_age_ascending(): void
    {
        Cat::factory()->create(['age' => 5]);
        Cat::factory()->create(['age' => 1]);
        Cat::factory()->create(['age' => 3]);

        $response = $this->getJson('/api/cats?sort_by=age&sort_direction=asc');
        $response->assertStatus(200)
                 ->assertJsonPath('0.age', 1)
                 ->assertJsonPath('1.age', 3)
                 ->assertJsonPath('2.age', 5);
    }

    public function test_can_sort_cats_by_age_descending(): void
    {
        Cat::factory()->create(['age' => 5]);
        Cat::factory()->create(['age' => 1]);
        Cat::factory()->create(['age' => 3]);

        $response = $this->getJson('/api/cats?sort_by=age&sort_direction=desc');
        $response->assertStatus(200)
                 ->assertJsonPath('0.age', 5)
                 ->assertJsonPath('1.age', 3)
                 ->assertJsonPath('2.age', 1);
    }
}
