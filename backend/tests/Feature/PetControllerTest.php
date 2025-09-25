<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\PetType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PetControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected PetType $catType;
    protected PetType $dogType;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
        
        // Create pet types
        $this->catType = PetType::create([
            'id' => 1, 
            'name' => 'Cat', 
            'slug' => 'cat', 
            'is_system' => true,
            'display_order' => 1
        ]);
        
        $this->dogType = PetType::create([
            'id' => 2, 
            'name' => 'Dog', 
            'slug' => 'dog', 
            'is_system' => true,
            'display_order' => 2
        ]);
    }

    public function test_can_create_pet()
    {
        Sanctum::actingAs($this->user);

        $petData = [
            'name' => 'Fluffy',
            'breed' => 'Persian',
            'birthday' => '2020-01-01',
            'location' => 'Hanoi',
            'description' => 'A lovely cat',
            'pet_type_id' => $this->catType->id,
        ];

        $response = $this->postJson('/api/pets', $petData);

        $response->assertStatus(201)
                ->assertJsonStructure([
                    'data' => [
                        'id',
                        'name',
                        'breed',
                        'birthday',
                        'location',
                        'description',
                        'pet_type_id',
                        'user_id',
                        'pet_type'
                    ]
                ]);

        $this->assertDatabaseHas('pets', [
            'name' => 'Fluffy',
            'breed' => 'Persian',
            'pet_type_id' => $this->catType->id,
            'user_id' => $this->user->id,
        ]);
    }

    public function test_can_get_my_pets()
    {
        Sanctum::actingAs($this->user);

        $cat = Pet::factory()->create([
            'user_id' => $this->user->id,
            'pet_type_id' => $this->catType->id,
        ]);

        $dog = Pet::factory()->create([
            'user_id' => $this->user->id,
            'pet_type_id' => $this->dogType->id,
        ]);

        $response = $this->getJson('/api/my-pets');

        $response->assertStatus(200)
                ->assertJsonCount(2, 'data')
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'name',
                            'pet_type_id',
                            'pet_type'
                        ]
                    ]
                ]);
    }

    public function test_can_get_pet_types()
    {
        Sanctum::actingAs($this->user);
        
        $response = $this->getJson('/api/pet-types');

        $response->assertStatus(200)
                ->assertJsonCount(2, 'data')
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'name',
                            'slug',
                            'description'
                        ]
                    ]
                ]);
    }

    public function test_can_show_pet()
    {
        Sanctum::actingAs($this->user);
        
        $pet = Pet::factory()->create([
            'user_id' => $this->user->id,
            'pet_type_id' => $this->catType->id,
        ]);

        $response = $this->getJson("/api/pets/{$pet->id}");

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        'id',
                        'name',
                        'pet_type_id',
                        'pet_type',
                        'viewer_permissions'
                    ]
                ]);
    }

    public function test_can_update_pet()
    {
        Sanctum::actingAs($this->user);

        $pet = Pet::factory()->create([
            'user_id' => $this->user->id,
            'pet_type_id' => $this->catType->id,
        ]);

        $updateData = [
            'name' => 'Updated Name',
            'breed' => 'Updated Breed',
        ];

        $response = $this->putJson("/api/pets/{$pet->id}", $updateData);

        $response->assertStatus(200);

        $this->assertDatabaseHas('pets', [
            'id' => $pet->id,
            'name' => 'Updated Name',
            'breed' => 'Updated Breed',
        ]);
    }

    public function test_can_delete_pet_soft_delete_status()
    {
        Sanctum::actingAs($this->user);

        $pet = Pet::factory()->create([
            'user_id' => $this->user->id,
            'pet_type_id' => $this->catType->id,
            'status' => \App\Enums\PetStatus::ACTIVE,
        ]);

        $response = $this->deleteJson("/api/pets/{$pet->id}", [
            'password' => 'password' // Default factory password
        ]);

        $response->assertStatus(204);

        // Row still exists but status is DELETED
        $this->assertDatabaseHas('pets', ['id' => $pet->id, 'status' => \App\Enums\PetStatus::DELETED->value]);
    }

    public function test_cannot_create_pet_without_authentication()
    {
        $petData = [
            'name' => 'Fluffy',
            'breed' => 'Persian',
            'birthday' => '2020-01-01',
            'location' => 'Hanoi',
            'description' => 'A lovely cat',
            'pet_type_id' => $this->catType->id,
        ];

        $response = $this->postJson('/api/pets', $petData);

        $response->assertStatus(401);
    }

    public function test_cannot_update_other_users_pet()
    {
        $otherUser = User::factory()->create();
        Sanctum::actingAs($this->user);

        $pet = Pet::factory()->create([
            'user_id' => $otherUser->id,
            'pet_type_id' => $this->catType->id,
        ]);

        $response = $this->putJson("/api/pets/{$pet->id}", [
            'name' => 'Hacked Name'
        ]);

        $response->assertStatus(403);
    }

    public function test_validates_required_fields()
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson('/api/pets', []);

        $response->assertStatus(422)
                ->assertJsonValidationErrors([
                    'name',
                    'breed',
                    'birthday',
                    'location',
                    'description',
                ]);

        // pet_type_id is optional and defaults; should NOT be a validation error.
        $this->assertArrayNotHasKey('pet_type_id', $response->json('errors'));
    }

    public function test_validates_pet_type_exists()
    {
        Sanctum::actingAs($this->user);

        $petData = [
            'name' => 'Fluffy',
            'breed' => 'Persian',
            'birthday' => '2020-01-01',
            'location' => 'Hanoi',
            'description' => 'A lovely cat',
            'pet_type_id' => 999, // Non-existent pet type
        ];

        $response = $this->postJson('/api/pets', $petData);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['pet_type_id']);
    }
}