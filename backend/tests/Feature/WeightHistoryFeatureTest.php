<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\PetType;
use App\Models\User;
use App\Models\WeightHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class WeightHistoryFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;

    protected User $otherUser;

    protected PetType $catType;

    protected PetType $dogType;

    protected Pet $pet;

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

        $this->pet = Pet::factory()->create([
            'created_by' => $this->owner->id,
            'pet_type_id' => $this->catType->id,
        ]);
    }

    public function test_owner_can_crud_weight_history()
    {
        Sanctum::actingAs($this->owner);

        // Create
        $create = $this->postJson("/api/pets/{$this->pet->id}/weights", [
            'weight_kg' => 4.25,
            'record_date' => '2024-06-01',
        ]);
        $create->assertStatus(201)->assertJsonPath('data.weight_kg', 4.25);
        $id = $create->json('data.id');

        // Index
        $index = $this->getJson("/api/pets/{$this->pet->id}/weights");
        $index->assertOk()->assertJsonStructure(['data' => ['data', 'links', 'meta']]);

        // Show
        $show = $this->getJson("/api/pets/{$this->pet->id}/weights/{$id}");
        $show->assertOk()->assertJsonPath('data.id', $id);

        // Update
        $update = $this->putJson("/api/pets/{$this->pet->id}/weights/{$id}", [
            'weight_kg' => 4.50,
        ]);
        $update->assertOk()->assertJsonPath('data.weight_kg', 4.50);

        // Delete
        $delete = $this->deleteJson("/api/pets/{$this->pet->id}/weights/{$id}");
        $delete->assertOk()->assertJson(['data' => true]);

        $this->assertDatabaseMissing('weight_histories', ['id' => $id]);
    }

    public function test_non_owner_cannot_access_weights()
    {
        Sanctum::actingAs($this->otherUser);

        // create attempt
        $res = $this->postJson("/api/pets/{$this->pet->id}/weights", [
            'weight_kg' => 3.2,
            'record_date' => '2024-05-01',
        ]);
        $res->assertStatus(403);

        // even list should be forbidden
        $res2 = $this->getJson("/api/pets/{$this->pet->id}/weights");
        $res2->assertStatus(403);
    }

    public function test_unique_record_date_per_pet()
    {
        Sanctum::actingAs($this->owner);

        $this->postJson("/api/pets/{$this->pet->id}/weights", [
            'weight_kg' => 4.0,
            'record_date' => '2024-01-02',
        ])->assertCreated();

        $this->postJson("/api/pets/{$this->pet->id}/weights", [
            'weight_kg' => 4.1,
            'record_date' => '2024-01-02',
        ])->assertStatus(422)->assertJsonValidationErrors(['record_date']);
    }

    public function test_404_when_accessing_weight_of_other_pet()
    {
        Sanctum::actingAs($this->owner);

        $otherPet = Pet::factory()->create([
            'created_by' => $this->owner->id,
            'pet_type_id' => $this->catType->id,
        ]);

        $wh = WeightHistory::create([
            'pet_id' => $otherPet->id,
            'weight_kg' => 3.5,
            'record_date' => '2024-03-03',
        ]);

        $this->getJson("/api/pets/{$this->pet->id}/weights/{$wh->id}")
            ->assertStatus(404);
    }

    public function test_capability_blocked_for_unsupported_type()
    {
        Sanctum::actingAs($this->owner);

        // make a dog pet which currently doesn't support 'weight'
        $dog = Pet::factory()->create([
            'created_by' => $this->owner->id,
            'pet_type_id' => $this->dogType->id,
        ]);

        $this->postJson("/api/pets/{$dog->id}/weights", [
            'weight_kg' => 10.0,
            'record_date' => '2024-02-02',
        ])->assertStatus(422)
            ->assertJsonPath('error_code', 'FEATURE_NOT_AVAILABLE_FOR_PET_TYPE');
    }

    public function test_admin_can_access_other_pets_weights()
    {
        $admin = User::factory()->create();
        Role::firstOrCreate(['name' => 'admin']);
        $admin->assignRole('admin');

        Sanctum::actingAs($admin);

        // Create weight for owner's pet
        $create = $this->postJson("/api/pets/{$this->pet->id}/weights", [
            'weight_kg' => 5.0,
            'record_date' => '2024-07-01',
        ]);
        $create->assertCreated();

        // List
        $this->getJson("/api/pets/{$this->pet->id}/weights")->assertOk();
    }
}
