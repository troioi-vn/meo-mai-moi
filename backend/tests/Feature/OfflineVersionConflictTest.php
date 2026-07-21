<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Habit;
use App\Models\Pet;
use App\Models\PetMicrochip;
use App\Models\PetType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class OfflineVersionConflictTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Pet $pet;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create();

        $catType = PetType::create([
            'id' => 1,
            'name' => 'Cat',
            'slug' => 'cat',
            'is_system' => true,
            'display_order' => 1,
        ]);

        $this->pet = Pet::factory()->create([
            'created_by' => $this->owner->id,
            'pet_type_id' => $catType->id,
        ]);
    }

    #[Test]
    public function it_conflicts_when_a_weight_update_uses_a_stale_base_version(): void
    {
        Sanctum::actingAs($this->owner);

        $create = $this->postJson("/api/pets/{$this->pet->id}/weights", [
            'weight_kg' => 4.0,
            'record_date' => '2024-11-01',
        ]);
        $create->assertCreated();
        $id = $create->json('data.id');
        $staleVersion = $create->json('data.updated_at');
        $this->assertIsString($staleVersion);

        $this->travel(2)->seconds();
        $this->putJson("/api/pets/{$this->pet->id}/weights/{$id}", [
            'weight_kg' => 4.2,
        ])->assertOk();

        $this->putJson("/api/pets/{$this->pet->id}/weights/{$id}", [
            'weight_kg' => 4.8,
            'base_version' => $staleVersion,
        ])
            ->assertStatus(409)
            ->assertJson([
                'success' => false,
                'message' => __('messages.offline.version_conflict'),
            ])
            ->assertJsonPath('data.client_base_version', $staleVersion)
            ->assertJsonPath('data.server_value.weight_kg', '4.20');

        $this->assertDatabaseHas('weight_histories', [
            'id' => $id,
            'weight_kg' => '4.20',
        ]);
    }

    #[Test]
    public function it_conflicts_when_a_pet_update_uses_a_stale_base_version(): void
    {
        Sanctum::actingAs($this->owner);
        $staleVersion = $this->pet->updated_at?->toJSON();
        $this->assertIsString($staleVersion);

        $this->travel(2)->seconds();
        $this->putJson("/api/pets/{$this->pet->id}", [
            'name' => 'Changed elsewhere',
        ])->assertOk();

        $this->putJson("/api/pets/{$this->pet->id}", [
            'name' => 'Stale agent change',
            'base_version' => $staleVersion,
        ])
            ->assertStatus(409)
            ->assertJsonPath('data.client_base_version', $staleVersion);

        $this->assertDatabaseHas('pets', [
            'id' => $this->pet->id,
            'name' => 'Changed elsewhere',
        ]);
    }

    #[Test]
    public function it_applies_a_weight_update_when_the_base_version_matches(): void
    {
        Sanctum::actingAs($this->owner);

        $create = $this->postJson("/api/pets/{$this->pet->id}/weights", [
            'weight_kg' => 4.0,
            'record_date' => '2024-11-02',
        ]);
        $create->assertCreated();
        $id = $create->json('data.id');
        $currentVersion = $create->json('data.updated_at');
        $this->assertIsString($currentVersion);

        $this->putJson("/api/pets/{$this->pet->id}/weights/{$id}", [
            'weight_kg' => 4.6,
            'base_version' => $currentVersion,
        ])
            ->assertOk()
            ->assertJsonPath('data.weight_kg', 4.6);
    }

    #[Test]
    public function it_replays_weight_create_with_the_same_idempotency_key(): void
    {
        Cache::flush();
        Sanctum::actingAs($this->owner);

        $key = 'offline-weight-create-replay';
        $payload = [
            'weight_kg' => 4.1,
            'record_date' => '2024-11-03',
        ];

        $first = $this->withHeader('Idempotency-Key', $key)
            ->postJson("/api/pets/{$this->pet->id}/weights", $payload);
        $first->assertCreated();
        $id = $first->json('data.id');

        $second = $this->withHeader('Idempotency-Key', $key)
            ->postJson("/api/pets/{$this->pet->id}/weights", $payload);
        $second->assertCreated()->assertJsonPath('data.id', $id);

        $this->assertSame(1, $this->pet->weightHistories()->count());
    }

    #[Test]
    public function it_treats_delete_of_an_already_deleted_weight_as_success_with_idempotency(): void
    {
        Cache::flush();
        Sanctum::actingAs($this->owner);

        $create = $this->postJson("/api/pets/{$this->pet->id}/weights", [
            'weight_kg' => 4.0,
            'record_date' => '2024-11-04',
        ]);
        $create->assertCreated();
        $id = $create->json('data.id');
        $url = "/api/pets/{$this->pet->id}/weights/{$id}";
        $key = 'offline-weight-delete-replay';

        $this->withHeader('Idempotency-Key', $key)
            ->deleteJson($url)
            ->assertOk();

        $this->withHeader('Idempotency-Key', $key)
            ->deleteJson($url)
            ->assertOk()
            ->assertJson(['data' => true]);
    }

    #[Test]
    public function it_rejects_a_stale_habit_lifecycle_change(): void
    {
        Sanctum::actingAs($this->owner);
        $habit = Habit::query()->create([
            'created_by' => $this->owner->id,
            'name' => 'Medication',
            'timezone' => 'UTC',
            'value_type' => 'yes_no',
            'day_summary_mode' => 'average_scored_pets',
        ]);
        $habit->pets()->sync([$this->pet->id]);
        $staleVersion = $habit->updated_at?->toJSON();
        $this->assertIsString($staleVersion);

        $this->travel(2)->seconds();
        $this->putJson("/api/habits/{$habit->id}", ['name' => 'Changed elsewhere'])->assertOk();

        $this->postJson("/api/habits/{$habit->id}/archive", ['base_version' => $staleVersion])
            ->assertStatus(409)
            ->assertJsonPath('data.client_base_version', $staleVersion);
        $this->assertNull($habit->fresh()?->archived_at);
    }

    #[Test]
    public function it_rejects_a_stale_microchip_update(): void
    {
        Sanctum::actingAs($this->owner);
        $microchip = PetMicrochip::query()->create([
            'pet_id' => $this->pet->id,
            'chip_number' => '987654321012345',
        ]);
        $staleVersion = $microchip->updated_at?->toJSON();
        $this->assertIsString($staleVersion);

        $this->travel(2)->seconds();
        $this->putJson("/api/pets/{$this->pet->id}/microchips/{$microchip->id}", [
            'issuer' => 'Changed elsewhere',
        ])->assertOk();

        $this->putJson("/api/pets/{$this->pet->id}/microchips/{$microchip->id}", [
            'issuer' => 'Stale agent change',
            'base_version' => $staleVersion,
        ])->assertStatus(409)
            ->assertJsonPath('data.client_base_version', $staleVersion);
        $this->assertSame('Changed elsewhere', $microchip->fresh()?->issuer);
    }

    #[Test]
    public function it_replays_a_multipart_photo_upload_without_duplicating_media(): void
    {
        Cache::flush();
        Sanctum::actingAs($this->owner);
        $key = 'offline-photo-create-replay';
        $image = static fn (): UploadedFile => UploadedFile::fake()->image('same-photo.png', 32, 32);

        $this->withHeader('Idempotency-Key', $key)
            ->postJson("/api/pets/{$this->pet->id}/photos", ['photo' => $image()])
            ->assertOk();
        $this->withHeader('Idempotency-Key', $key)
            ->postJson("/api/pets/{$this->pet->id}/photos", ['photo' => $image()])
            ->assertOk();

        $this->assertCount(1, $this->pet->fresh()?->getMedia('photos') ?? []);
    }
}
