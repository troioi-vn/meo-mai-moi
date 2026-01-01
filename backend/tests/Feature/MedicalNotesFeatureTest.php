<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\PetType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MedicalNotesFeatureTest extends TestCase
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

    public function test_owner_can_crud_medical_notes()
    {
        Sanctum::actingAs($this->owner);

        // Create
        $create = $this->postJson("/api/pets/{$this->pet->id}/medical-notes", [
            'note' => 'Rabies vaccination administered',
            'record_date' => '2024-06-01',
        ]);
        $create->assertStatus(201);
        $id = $create->json('data.id');

        // Index
        $this->getJson("/api/pets/{$this->pet->id}/medical-notes")
            ->assertOk()
            ->assertJsonStructure(['data' => ['data', 'links', 'meta']]);

        // Show
        $this->getJson("/api/pets/{$this->pet->id}/medical-notes/{$id}")
            ->assertOk()
            ->assertJsonPath('data.id', $id);

        // Update
        $this->putJson("/api/pets/{$this->pet->id}/medical-notes/{$id}", [
            'note' => 'Rabies vaccination administered - booster',
        ])->assertOk()->assertJsonPath('data.note', 'Rabies vaccination administered - booster');

        // Delete
        $this->deleteJson("/api/pets/{$this->pet->id}/medical-notes/{$id}")
            ->assertOk()->assertJson(['data' => true]);
    }

    public function test_non_owner_cannot_access_medical_notes()
    {
        Sanctum::actingAs($this->otherUser);

        $this->postJson("/api/pets/{$this->pet->id}/medical-notes", [
            'note' => 'Test',
            'record_date' => '2024-05-01',
        ])->assertStatus(403);

        $this->getJson("/api/pets/{$this->pet->id}/medical-notes")->assertStatus(403);
    }

    public function test_unique_record_date_per_pet()
    {
        Sanctum::actingAs($this->owner);

        $this->postJson("/api/pets/{$this->pet->id}/medical-notes", [
            'note' => 'Visit',
            'record_date' => '2024-01-02',
        ])->assertCreated();

        $this->postJson("/api/pets/{$this->pet->id}/medical-notes", [
            'note' => 'Another',
            'record_date' => '2024-01-02',
        ])->assertStatus(422)->assertJsonValidationErrors(['record_date']);
    }

    public function test_admin_can_access_other_pets_notes()
    {
        $admin = User::factory()->create();
        Role::firstOrCreate(['name' => 'admin']);
        $admin->assignRole('admin');

        Sanctum::actingAs($admin);
        $this->postJson("/api/pets/{$this->pet->id}/medical-notes", [
            'note' => 'Admin added note',
            'record_date' => '2024-07-01',
        ])->assertCreated();

        $this->getJson("/api/pets/{$this->pet->id}/medical-notes")->assertOk();
    }
}
