<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\PetType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Spatie\Permission\Models\Role;

class VaccinationRecordsFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;
    protected User $otherUser;
    protected PetType $catType;
    protected PetType $dogType;
    protected Pet $cat;
    protected Pet $dog;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create();
        $this->otherUser = User::factory()->create();

        $this->catType = PetType::create([
            'id' => 1,
            'name' => 'Cat',
            'slug' => 'cat',
            'is_system' => true,
            'display_order' => 1,
        ]);

        $this->dogType = PetType::create([
            'id' => 2,
            'name' => 'Dog',
            'slug' => 'dog',
            'is_system' => true,
            'display_order' => 2,
        ]);

        $this->cat = Pet::factory()->create([
            'user_id' => $this->owner->id,
            'pet_type_id' => $this->catType->id,
        ]);

        $this->dog = Pet::factory()->create([
            'user_id' => $this->owner->id,
            'pet_type_id' => $this->dogType->id,
        ]);
    }

    public function test_owner_can_crud_vaccinations_for_cat()
    {
        Sanctum::actingAs($this->owner);

        // Create
        $create = $this->postJson("/api/pets/{$this->cat->id}/vaccinations", [
            'vaccine_name' => 'Rabies',
            'administered_at' => '2024-06-01',
            'due_at' => '2025-06-01',
            'notes' => 'Booster next year',
        ]);
        $create->assertStatus(201);
        $id = $create->json('data.id');

        // Index
        $this->getJson("/api/pets/{$this->cat->id}/vaccinations")
            ->assertOk()
            ->assertJsonStructure(['data' => ['data', 'links', 'meta']]);

        // Show
        $this->getJson("/api/pets/{$this->cat->id}/vaccinations/{$id}")
            ->assertOk()
            ->assertJsonPath('data.id', $id);

        // Update
        $this->putJson("/api/pets/{$this->cat->id}/vaccinations/{$id}", [
            'notes' => 'Updated notes',
        ])->assertOk()->assertJsonPath('data.notes', 'Updated notes');

        // Delete
        $this->deleteJson("/api/pets/{$this->cat->id}/vaccinations/{$id}")
            ->assertOk()->assertJson(['data' => true]);
    }

    public function test_non_owner_cannot_access_vaccinations()
    {
        Sanctum::actingAs($this->otherUser);

        $this->postJson("/api/pets/{$this->cat->id}/vaccinations", [
            'vaccine_name' => 'Rabies',
            'administered_at' => '2024-06-01',
        ])->assertStatus(403);

        $this->getJson("/api/pets/{$this->cat->id}/vaccinations")->assertStatus(403);
    }

    public function test_unique_vaccination_per_date_and_name()
    {
        Sanctum::actingAs($this->owner);

        $this->postJson("/api/pets/{$this->cat->id}/vaccinations", [
            'vaccine_name' => 'Rabies',
            'administered_at' => '2024-06-01',
        ])->assertCreated();

        $this->postJson("/api/pets/{$this->cat->id}/vaccinations", [
            'vaccine_name' => 'Rabies',
            'administered_at' => '2024-06-01',
        ])->assertStatus(422)->assertJsonValidationErrors(['administered_at']);
    }

    public function test_admin_can_access_other_pets_vaccinations()
    {
        $admin = User::factory()->create();
        Role::firstOrCreate(['name' => 'admin']);
        $admin->assignRole('admin');

        Sanctum::actingAs($admin);
        $this->postJson("/api/pets/{$this->cat->id}/vaccinations", [
            'vaccine_name' => 'Rabies',
            'administered_at' => '2024-06-01',
        ])->assertCreated();

        $this->getJson("/api/pets/{$this->cat->id}/vaccinations")->assertOk();
    }

    public function test_dog_is_gated_for_vaccinations()
    {
        Sanctum::actingAs($this->owner);

        $this->postJson("/api/pets/{$this->dog->id}/vaccinations", [
            'vaccine_name' => 'Rabies',
            'administered_at' => '2024-06-01',
        ])->assertStatus(422)->assertJsonPath('error_code', 'FEATURE_NOT_AVAILABLE_FOR_PET_TYPE');
    }
}
