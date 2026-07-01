<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\PetType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MedicalRecordsFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;

    protected User $otherUser;

    protected PetType $catType;

    protected Pet $cat;

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

        $this->cat = Pet::factory()->create([
            'created_by' => $this->owner->id,
            'pet_type_id' => $this->catType->id,
        ]);
    }

    public function test_owner_can_create_medical_record()
    {
        Sanctum::actingAs($this->owner);

        $create = $this->postJson("/api/pets/{$this->cat->id}/medical-records", [
            'record_type' => 'vet_visit',
            'description' => 'Annual checkup',
            'record_date' => '2024-06-01',
            'vet_name' => 'Dr. Smith',
        ]);

        $create->assertStatus(201)
            ->assertJsonPath('data.record_type', 'vet_visit')
            ->assertJsonPath('data.description', 'Annual checkup');

        $this->assertDatabaseHas('medical_records', [
            'pet_id' => $this->cat->id,
            'record_type' => 'vet_visit',
            'description' => 'Annual checkup',
        ]);
    }

    public function test_non_owner_cannot_create_medical_record()
    {
        Sanctum::actingAs($this->otherUser);

        $this->postJson("/api/pets/{$this->cat->id}/medical-records", [
            'record_type' => 'vet_visit',
            'description' => 'Annual checkup',
            'record_date' => '2024-06-01',
        ])->assertStatus(403);
    }

    public function test_medical_record_create_replays_without_creating_a_duplicate()
    {
        Cache::flush();
        Sanctum::actingAs($this->owner);

        $payload = [
            'record_type' => 'vet_visit',
            'description' => 'Annual checkup',
            'record_date' => '2024-06-01',
            'vet_name' => 'Dr. Smith',
        ];

        $first = $this->withHeader('Idempotency-Key', 'medical-record-create-1')
            ->postJson("/api/pets/{$this->cat->id}/medical-records", $payload);

        $second = $this->withHeader('Idempotency-Key', 'medical-record-create-1')
            ->postJson("/api/pets/{$this->cat->id}/medical-records", $payload);

        $first->assertCreated();
        $second->assertCreated()
            ->assertExactJson($first->json());

        $this->assertDatabaseCount('medical_records', 1);
    }

    public function test_medical_record_create_conflicts_when_reusing_idempotency_key_with_different_payload()
    {
        Cache::flush();
        Sanctum::actingAs($this->owner);

        $key = 'medical-record-create-2';

        $this->withHeader('Idempotency-Key', $key)
            ->postJson("/api/pets/{$this->cat->id}/medical-records", [
                'record_type' => 'vet_visit',
                'description' => 'Annual checkup',
                'record_date' => '2024-06-01',
            ])
            ->assertCreated();

        $this->withHeader('Idempotency-Key', $key)
            ->postJson("/api/pets/{$this->cat->id}/medical-records", [
                'record_type' => 'vaccination',
                'description' => 'Rabies vaccine',
                'record_date' => '2024-06-01',
            ])
            ->assertStatus(409)
            ->assertJson([
                'success' => false,
                'message' => __('messages.idempotency.conflict'),
            ]);

        $this->assertDatabaseCount('medical_records', 1);
    }
}
