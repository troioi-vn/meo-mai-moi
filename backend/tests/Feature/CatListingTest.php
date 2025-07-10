<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CatListingTest extends TestCase
{
    use RefreshDatabase;

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
}
