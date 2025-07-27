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


    public function test_can_get_single_cat_profile(): void
    {
        $user = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $user->id]);
        Sanctum::actingAs($user);

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
}
