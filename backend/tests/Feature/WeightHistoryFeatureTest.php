<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\PetType;
use App\Models\User;
use App\Models\WeightHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
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
            'tare_weight_kg' => 62.4,
        ]);
        $create->assertStatus(201)->assertJsonPath('data.weight_kg', 4.25);
        $id = $create->json('data.id');
        $this->assertDatabaseHas('owner_weight_histories', [
            'user_id' => $this->owner->id,
            'record_date' => '2024-06-01',
            'weight_kg' => '62.40',
        ]);

        // Index
        $index = $this->getJson("/api/pets/{$this->pet->id}/weights");
        $index->assertOk()->assertJsonStructure(['data' => ['data', 'links', 'meta']]);

        // Show
        $show = $this->getJson("/api/pets/{$this->pet->id}/weights/{$id}");
        $show->assertOk()->assertJsonPath('data.id', $id);

        // Update
        $update = $this->putJson("/api/pets/{$this->pet->id}/weights/{$id}", [
            'weight_kg' => 4.50,
            'tare_weight_kg' => 63.1,
        ]);
        $update->assertOk()->assertJsonPath('data.weight_kg', 4.50);
        $this->assertDatabaseHas('owner_weight_histories', [
            'user_id' => $this->owner->id,
            'record_date' => '2024-06-01',
            'weight_kg' => '63.10',
        ]);

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

    public function test_editor_can_access_weights()
    {
        $editor = User::factory()->create();
        PetRelationship::factory()->create([
            'pet_id' => $this->pet->id,
            'user_id' => $editor->id,
            'relationship_type' => 'editor',
            'end_at' => null,
            'created_by' => $this->owner->id,
        ]);

        Sanctum::actingAs($editor);

        $create = $this->postJson("/api/pets/{$this->pet->id}/weights", [
            'weight_kg' => 3.2,
            'record_date' => '2024-05-01',
        ]);
        $create->assertStatus(201);

        $this->getJson("/api/pets/{$this->pet->id}/weights")->assertStatus(200);
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

    public function test_tare_weight_is_ignored_when_not_provided()
    {
        Sanctum::actingAs($this->owner);

        $this->postJson("/api/pets/{$this->pet->id}/weights", [
            'weight_kg' => 4.0,
            'record_date' => '2024-01-03',
        ])->assertCreated();

        $this->assertDatabaseMissing('owner_weight_histories', [
            'user_id' => $this->owner->id,
            'record_date' => '2024-01-03',
        ]);
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

    public function test_admin_cannot_access_other_pets_weights()
    {
        $admin = User::factory()->create();
        Role::firstOrCreate(['name' => 'admin']);
        $admin->assignRole('admin');

        Sanctum::actingAs($admin);

        $create = $this->postJson("/api/pets/{$this->pet->id}/weights", [
            'weight_kg' => 5.0,
            'record_date' => '2024-07-01',
        ]);
        $create->assertForbidden();

        $this->getJson("/api/pets/{$this->pet->id}/weights")->assertForbidden();
    }

    #[Test]
    public function it_creates_one_weight_record_on_first_idempotent_request(): void
    {
        Cache::flush();
        Sanctum::actingAs($this->owner);

        $payload = [
            'weight_kg' => 4.75,
            'record_date' => '2024-08-01',
        ];

        $response = $this->withHeader('Idempotency-Key', 'weight-create-1')
            ->postJson("/api/pets/{$this->pet->id}/weights", $payload);

        $response->assertCreated()
            ->assertJsonPath('data.weight_kg', 4.75)
            ->assertJsonPath('success', true);

        $this->assertDatabaseCount('weight_histories', 1);
        $this->assertDatabaseHas('weight_histories', [
            'pet_id' => $this->pet->id,
            'weight_kg' => '4.75',
            'record_date' => '2024-08-01',
        ]);
    }

    #[Test]
    public function it_replays_weight_create_without_creating_a_duplicate(): void
    {
        Cache::flush();
        Sanctum::actingAs($this->owner);

        $headers = ['Idempotency-Key' => 'weight-create-2'];
        $payload = [
            'weight_kg' => 5.10,
            'record_date' => '2024-08-02',
        ];

        $first = $this->withHeader('Idempotency-Key', $headers['Idempotency-Key'])
            ->postJson("/api/pets/{$this->pet->id}/weights", $payload);

        $second = $this->withHeader('Idempotency-Key', $headers['Idempotency-Key'])
            ->postJson("/api/pets/{$this->pet->id}/weights", $payload);

        $first->assertCreated();
        $second->assertCreated()
            ->assertExactJson($first->json());

        $this->assertDatabaseCount('weight_histories', 1);
    }

    #[Test]
    public function it_conflicts_when_reusing_an_idempotency_key_with_a_different_weight_payload(): void
    {
        Cache::flush();
        Sanctum::actingAs($this->owner);

        $key = 'weight-create-3';

        $this->withHeader('Idempotency-Key', $key)
            ->postJson("/api/pets/{$this->pet->id}/weights", [
                'weight_kg' => 5.0,
                'record_date' => '2024-08-03',
            ])
            ->assertCreated();

        $this->withHeader('Idempotency-Key', $key)
            ->postJson("/api/pets/{$this->pet->id}/weights", [
                'weight_kg' => 5.5,
                'record_date' => '2024-08-03',
            ])
            ->assertStatus(409)
            ->assertJson([
                'success' => false,
                'message' => __('messages.idempotency.conflict'),
            ]);

        $this->assertDatabaseCount('weight_histories', 1);
    }

    #[Test]
    public function it_creates_separate_records_when_no_idempotency_key_is_sent(): void
    {
        Sanctum::actingAs($this->owner);

        $this->postJson("/api/pets/{$this->pet->id}/weights", [
            'weight_kg' => 4.0,
            'record_date' => '2024-08-04',
        ])->assertCreated();

        $this->postJson("/api/pets/{$this->pet->id}/weights", [
            'weight_kg' => 4.2,
            'record_date' => '2024-08-05',
        ])->assertCreated();

        $this->assertDatabaseCount('weight_histories', 2);
    }
}
