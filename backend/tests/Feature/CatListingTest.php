<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;
use App\Enums\CatStatus;
use Tests\Traits\CreatesUsers;

class CatListingTest extends TestCase
{
    use RefreshDatabase, CreatesUsers;


    #[Test]
    public function can_get_single_cat_profile(): void
    {
        $user = $this->createUserAndLogin();
        $cat = Cat::factory()->create(['user_id' => $user->id]);

        $response = $this->getJson("/api/cats/{$cat->id}");
        $response->assertStatus(200)->assertJson(['data' => ['id' => $cat->id]]);
    }

    #[Test]
    public function authenticated_user_can_create_cat_listing(): void
    {
        $this->createUserAndLogin();

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

    #[Test]
    public function guest_cannot_create_cat_listing(): void
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
