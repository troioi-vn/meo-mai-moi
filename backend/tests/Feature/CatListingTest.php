<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;
use App\Enums\CatStatus;

class CatListingTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_can_get_all_available_cats(): void
    {
        Cat::factory()->count(3)->create(['status' => CatStatus::ACTIVE->value]);
        Cat::factory()->count(2)->create(['status' => CatStatus::DECEASED->value]);
        $response = $this->getJson('/api/cats');
        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_can_get_featured_cats(): void
    {
        Cat::factory()->count(5)->create();
        $response = $this->getJson('/api/cats/featured');
        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_can_get_single_cat_profile(): void
    {
        $cat = Cat::factory()->create();
        $response = $this->getJson("/api/cats/{$cat->id}");
        $response->assertStatus(200)->assertJson(['data' => ['id' => $cat->id]]);
    }

    public function test_authenticated_user_can_create_cat_listing(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $catData = [
            'name' => 'Test Cat',
            'breed' => 'Test Breed',
            'birthday' => '2023-01-01 00:00:00',
            'location' => 'Test Location',
            'description' => 'Test Description',
        ];

        $response = $this->postJson('/api/cats', $catData);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['id', 'name', 'breed']]);
        $this->assertDatabaseHas('cats', $catData);
    }

    public function test_guest_cannot_create_cat_listing(): void
    {
        $catData = [
            'name' => 'Test Cat',
            'breed' => 'Test Breed',
            'birthday' => '2023-01-01',
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
        $response->assertStatus(200)->assertJsonCount(2, 'data');
    }

    public function test_can_filter_cats_by_breed(): void
    {
        Cat::factory()->create(['breed' => 'Siamese']);
        Cat::factory()->create(['breed' => 'Persian']);
        Cat::factory()->create(['breed' => 'Siamese']);

        $response = $this->getJson('/api/cats?breed=Siamese');
        $response->assertStatus(200)->assertJsonCount(2, 'data');
    }

    public function test_can_sort_cats_by_name_ascending(): void
    {
        Cat::factory()->create(['name' => 'B Cat']);
        Cat::factory()->create(['name' => 'A Cat']);
        Cat::factory()->create(['name' => 'C Cat']);

        $response = $this->getJson('/api/cats?sort_by=name&sort_direction=asc');
        $response->assertStatus(200)
                 ->assertJsonPath('data.0.name', 'A Cat')
                 ->assertJsonPath('data.1.name', 'B Cat')
                 ->assertJsonPath('data.2.name', 'C Cat');
    }

    public function test_can_sort_cats_by_name_descending(): void
    {
        Cat::factory()->create(['name' => 'B Cat']);
        Cat::factory()->create(['name' => 'A Cat']);
        Cat::factory()->create(['name' => 'C Cat']);

        $response = $this->getJson('/api/cats?sort_by=name&sort_direction=desc');
        $response->assertStatus(200)
                 ->assertJsonPath('data.0.name', 'C Cat')
                 ->assertJsonPath('data.1.name', 'B Cat')
                 ->assertJsonPath('data.2.name', 'A Cat');
    }

    public function test_can_sort_cats_by_birthday_ascending(): void
    {
        Cat::factory()->create(['birthday' => '2020-01-01']);
        Cat::factory()->create(['birthday' => '2022-01-01']);
        Cat::factory()->create(['birthday' => '2021-01-01']);

        $response = $this->getJson('/api/cats?sort_by=birthday&sort_direction=asc');
        $response->assertStatus(200);
        $responseCats = $response->json('data');
        $birthdays = array_column($responseCats, 'birthday');
        $this->assertEquals(['2020-01-01T00:00:00.000000Z', '2021-01-01T00:00:00.000000Z', '2022-01-01T00:00:00.000000Z'], $birthdays);
    }

    public function test_can_sort_cats_by_birthday_descending(): void
    {
        Cat::factory()->create(['birthday' => '2020-01-01']);
        Cat::factory()->create(['birthday' => '2022-01-01']);
        Cat::factory()->create(['birthday' => '2021-01-01']);

        $response = $this->getJson('/api/cats?sort_by=birthday&sort_direction=desc');
        $response->assertStatus(200);
        $responseCats = $response->json('data');
        $birthdays = array_column($responseCats, 'birthday');
        $this->assertEquals(['2022-01-01T00:00:00.000000Z', '2021-01-01T00:00:00.000000Z', '2020-01-01T00:00:00.000000Z'], $birthdays);
    }
}
